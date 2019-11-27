/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Observable } from 'rxjs';
import { filter, first, map, mergeMap, tap, toArray } from 'rxjs/operators';
import { CoreService } from '../../types';
import { CoreContext } from '../core_context';

import { Logger } from '../logging';
import { discover, PluginDiscoveryError, PluginDiscoveryErrorType } from './discovery';
import { PluginWrapper } from './plugin';
import { DiscoveredPlugin, PluginConfigDescriptor, PluginName, InternalPluginInfo } from './types';
import { PluginsConfig, PluginsConfigType } from './plugins_config';
import { PluginsSystem } from './plugins_system';
import { InternalCoreSetup, InternalCoreStart } from '../internal_types';
import { IConfigService } from '../config';
import { pick } from '../../utils';

/** @public */
export interface PluginsServiceSetup {
  contracts: Map<PluginName, unknown>;
  uiPlugins: {
    /**
     * Paths to all discovered ui plugin entrypoints on the filesystem, even if
     * disabled.
     */
    internal: Map<PluginName, InternalPluginInfo>;

    /**
     * Information needed by client-side to load plugins and wire dependencies.
     */
    public: Map<PluginName, DiscoveredPlugin>;

    /**
     * Configuration for plugins to be exposed to the client-side.
     */
    browserConfigs: Map<PluginName, Observable<unknown>>;
  };
}

/** @public */
export interface PluginsServiceStart {
  contracts: Map<PluginName, unknown>;
}

/** @internal */
export type PluginsServiceSetupDeps = InternalCoreSetup;

/** @internal */
export type PluginsServiceStartDeps = InternalCoreStart;

/** @internal */
export class PluginsService implements CoreService<PluginsServiceSetup, PluginsServiceStart> {
  private readonly log: Logger;
  private readonly pluginsSystem: PluginsSystem;
  private readonly configService: IConfigService;
  private readonly config$: Observable<PluginsConfig>;
  private readonly pluginConfigDescriptors = new Map<PluginName, PluginConfigDescriptor>();
  private readonly uiPluginInternalInfo = new Map<PluginName, InternalPluginInfo>();

  constructor(private readonly coreContext: CoreContext) {
    this.log = coreContext.logger.get('plugins-service');
    this.pluginsSystem = new PluginsSystem(coreContext);
    this.configService = coreContext.configService;
    this.config$ = coreContext.configService
      .atPath<PluginsConfigType>('plugins')
      .pipe(map(rawConfig => new PluginsConfig(rawConfig, coreContext.env)));
  }

  public async discover() {
    this.log.debug('Discovering plugins');

    const config = await this.config$.pipe(first()).toPromise();

    const { error$, plugin$ } = discover(config, this.coreContext);
    await this.handleDiscoveryErrors(error$);
    await this.handleDiscoveredPlugins(plugin$);

    // Return dependency tree
    return this.pluginsSystem.getPluginDependencies();
  }

  public async setup(deps: PluginsServiceSetupDeps) {
    this.log.debug('Setting up plugins service');

    const config = await this.config$.pipe(first()).toPromise();

    let contracts = new Map<PluginName, unknown>();
    if (!config.initialize || this.coreContext.env.isDevClusterMaster) {
      this.log.info('Plugin initialization disabled.');
    } else {
      contracts = await this.pluginsSystem.setupPlugins(deps);
    }

    const uiPlugins = this.pluginsSystem.uiPlugins();
    return {
      contracts,
      uiPlugins: {
        internal: this.uiPluginInternalInfo,
        public: uiPlugins,
        browserConfigs: this.generateUiPluginsConfigs(uiPlugins),
      },
    };
  }

  public async start(deps: PluginsServiceStartDeps) {
    this.log.debug('Plugins service starts plugins');
    const contracts = await this.pluginsSystem.startPlugins(deps);
    return { contracts };
  }

  public async stop() {
    this.log.debug('Stopping plugins service');
    await this.pluginsSystem.stopPlugins();
  }

  private generateUiPluginsConfigs(
    uiPlugins: Map<string, DiscoveredPlugin>
  ): Map<PluginName, Observable<unknown>> {
    return new Map(
      [...uiPlugins]
        .filter(([pluginId, _]) => {
          const configDescriptor = this.pluginConfigDescriptors.get(pluginId);
          return (
            configDescriptor &&
            configDescriptor.exposeToBrowser &&
            Object.values(configDescriptor?.exposeToBrowser).some(exposed => exposed)
          );
        })
        .map(([pluginId, plugin]) => {
          const configDescriptor = this.pluginConfigDescriptors.get(pluginId)!;
          return [
            pluginId,
            this.configService.atPath(plugin.configPath).pipe(
              map((config: any) =>
                pick(
                  config || {},
                  Object.entries(configDescriptor.exposeToBrowser!)
                    .filter(([_, exposed]) => exposed)
                    .map(([key, _]) => key)
                )
              )
            ),
          ];
        })
    );
  }

  private async handleDiscoveryErrors(error$: Observable<PluginDiscoveryError>) {
    // At this stage we report only errors that can occur when new platform plugin
    // manifest is present, otherwise we can't be sure that the plugin is for the new
    // platform and let legacy platform to handle it.
    const errorTypesToReport = [
      PluginDiscoveryErrorType.IncompatibleVersion,
      PluginDiscoveryErrorType.InvalidManifest,
    ];

    const errors = await error$
      .pipe(
        filter(error => errorTypesToReport.includes(error.type)),
        tap(pluginError => this.log.error(pluginError)),
        toArray()
      )
      .toPromise();
    if (errors.length > 0) {
      throw new Error(
        `Failed to initialize plugins:${errors.map(err => `\n\t${err.message}`).join('')}`
      );
    }
  }

  private async handleDiscoveredPlugins(plugin$: Observable<PluginWrapper>) {
    const pluginEnableStatuses = new Map<
      PluginName,
      { plugin: PluginWrapper; isEnabled: boolean }
    >();
    await plugin$
      .pipe(
        mergeMap(async plugin => {
          const configDescriptor = plugin.getConfigDescriptor();
          if (configDescriptor) {
            this.pluginConfigDescriptors.set(plugin.name, configDescriptor);
            await this.coreContext.configService.setSchema(
              plugin.configPath,
              configDescriptor.schema
            );
          }
          const isEnabled = await this.coreContext.configService.isEnabledAtPath(plugin.configPath);

          if (pluginEnableStatuses.has(plugin.name)) {
            throw new Error(`Plugin with id "${plugin.name}" is already registered!`);
          }

          if (plugin.includesUiPlugin) {
            this.uiPluginInternalInfo.set(plugin.name, { entryPointPath: `${plugin.path}/public` });
          }

          pluginEnableStatuses.set(plugin.name, { plugin, isEnabled });
        })
      )
      .toPromise();

    for (const [pluginName, { plugin, isEnabled }] of pluginEnableStatuses) {
      if (this.shouldEnablePlugin(pluginName, pluginEnableStatuses)) {
        this.pluginsSystem.addPlugin(plugin);
      } else if (isEnabled) {
        this.log.info(
          `Plugin "${pluginName}" has been disabled since some of its direct or transitive dependencies are missing or disabled.`
        );
      } else {
        this.log.info(`Plugin "${pluginName}" is disabled.`);
      }
    }

    this.log.debug(`Discovered ${pluginEnableStatuses.size} plugins.`);
  }

  private shouldEnablePlugin(
    pluginName: PluginName,
    pluginEnableStatuses: Map<PluginName, { plugin: PluginWrapper; isEnabled: boolean }>,
    parents: PluginName[] = []
  ): boolean {
    const pluginInfo = pluginEnableStatuses.get(pluginName);
    return (
      pluginInfo !== undefined &&
      pluginInfo.isEnabled &&
      pluginInfo.plugin.requiredPlugins
        .filter(dep => !parents.includes(dep))
        .every(dependencyName =>
          this.shouldEnablePlugin(dependencyName, pluginEnableStatuses, [...parents, pluginName])
        )
    );
  }
}
