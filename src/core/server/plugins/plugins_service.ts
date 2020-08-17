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

import Path from 'path';
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

/** @internal */
export interface PluginsServiceSetup {
  /** Indicates whether or not plugins were initialized. */
  initialized: boolean;
  /** Setup contracts returned by plugins. */
  contracts: Map<PluginName, unknown>;
}

/** @internal */
export interface UiPlugins {
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
}

/** @internal */
export interface PluginsServiceStart {
  /** Start contracts returned by plugins. */
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
      .pipe(map((rawConfig) => new PluginsConfig(rawConfig, coreContext.env)));
  }

  public async discover() {
    this.log.debug('Discovering plugins');

    const config = await this.config$.pipe(first()).toPromise();

    const { error$, plugin$ } = discover(config, this.coreContext);
    await this.handleDiscoveryErrors(error$);
    await this.handleDiscoveredPlugins(plugin$);

    const uiPlugins = this.pluginsSystem.uiPlugins();

    return {
      // Return dependency tree
      pluginTree: this.pluginsSystem.getPluginDependencies(),
      uiPlugins: {
        internal: this.uiPluginInternalInfo,
        public: uiPlugins,
        browserConfigs: this.generateUiPluginsConfigs(uiPlugins),
      },
    };
  }

  public async setup(deps: PluginsServiceSetupDeps) {
    this.log.debug('Setting up plugins service');

    const config = await this.config$.pipe(first()).toPromise();

    let contracts = new Map<PluginName, unknown>();
    const initialize = config.initialize && !this.coreContext.env.isDevClusterMaster;
    if (initialize) {
      contracts = await this.pluginsSystem.setupPlugins(deps);
      this.registerPluginStaticDirs(deps);
    } else {
      this.log.info('Plugin initialization disabled.');
    }

    return {
      initialized: initialize,
      contracts,
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
            Object.values(configDescriptor?.exposeToBrowser).some((exposed) => exposed)
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
        filter((error) => errorTypesToReport.includes(error.type)),
        tap((pluginError) => this.log.error(pluginError)),
        toArray()
      )
      .toPromise();
    if (errors.length > 0) {
      throw new Error(
        `Failed to initialize plugins:${errors.map((err) => `\n\t${err.message}`).join('')}`
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
        mergeMap(async (plugin) => {
          const configDescriptor = plugin.getConfigDescriptor();
          if (configDescriptor) {
            this.pluginConfigDescriptors.set(plugin.name, configDescriptor);
            if (configDescriptor.deprecations) {
              this.coreContext.configService.addDeprecationProvider(
                plugin.configPath,
                configDescriptor.deprecations
              );
            }
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
            this.uiPluginInternalInfo.set(plugin.name, {
              requiredBundles: plugin.requiredBundles,
              publicTargetDir: Path.resolve(plugin.path, 'target/public'),
              publicAssetsDir: Path.resolve(plugin.path, 'public/assets'),
            });
          }

          pluginEnableStatuses.set(plugin.name, { plugin, isEnabled });
        })
      )
      .toPromise();

    for (const [pluginName, { plugin, isEnabled }] of pluginEnableStatuses) {
      // validate that `requiredBundles` ids point to a discovered plugin which `includesUiPlugin`
      for (const requiredBundleId of plugin.requiredBundles) {
        if (!pluginEnableStatuses.has(requiredBundleId)) {
          throw new Error(
            `Plugin bundle with id "${requiredBundleId}" is required by plugin "${pluginName}" but it is missing.`
          );
        }

        if (!pluginEnableStatuses.get(requiredBundleId)!.plugin.includesUiPlugin) {
          throw new Error(
            `Plugin bundle with id "${requiredBundleId}" is required by plugin "${pluginName}" but it doesn't have a UI bundle.`
          );
        }
      }

      const pluginEnablement = this.shouldEnablePlugin(pluginName, pluginEnableStatuses);

      if (pluginEnablement.enabled) {
        this.pluginsSystem.addPlugin(plugin);
      } else if (isEnabled) {
        this.log.info(
          `Plugin "${pluginName}" has been disabled since the following direct or transitive dependencies are missing or disabled: [${pluginEnablement.missingDependencies.join(
            ', '
          )}]`
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
  ): { enabled: true } | { enabled: false; missingDependencies: string[] } {
    const pluginInfo = pluginEnableStatuses.get(pluginName);

    if (pluginInfo === undefined || !pluginInfo.isEnabled) {
      return {
        enabled: false,
        missingDependencies: [],
      };
    }

    const missingDependencies = pluginInfo.plugin.requiredPlugins
      .filter((dep) => !parents.includes(dep))
      .filter(
        (dependencyName) =>
          !this.shouldEnablePlugin(dependencyName, pluginEnableStatuses, [...parents, pluginName])
            .enabled
      );

    if (missingDependencies.length === 0) {
      return {
        enabled: true,
      };
    }

    return {
      enabled: false,
      missingDependencies,
    };
  }

  private registerPluginStaticDirs(deps: PluginsServiceSetupDeps) {
    for (const [pluginName, pluginInfo] of this.uiPluginInternalInfo) {
      deps.http.registerStaticDir(
        `/plugins/${pluginName}/assets/{path*}`,
        pluginInfo.publicAssetsDir
      );
    }
  }
}
