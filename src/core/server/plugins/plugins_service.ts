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

import { first } from 'rxjs/operators';
import { CoreService } from '../../types';
import { CoreContext } from '../core_context';
import { ElasticsearchServiceSetup } from '../elasticsearch/elasticsearch_service';
import { HttpServiceSetup } from '../http/http_service';
import { Logger } from '../logging';
import {
  PluginDiscoveryError,
  PluginDiscoveryErrorType,
  DiscoveredPluginsDefinitions,
} from './discovery';
import { DiscoveredPlugin, DiscoveredPluginInternal, PluginWrapper, PluginName } from './plugin';
import { createPluginInitializerContext } from './plugin_context';
import { PluginsConfig } from './plugins_config';
import { PluginsSystem } from './plugins_system';
import { discover } from './discovery';

/** @internal */
export interface PluginsServiceSetup {
  contracts: Map<PluginName, unknown>;
  uiPlugins: {
    public: Map<PluginName, DiscoveredPlugin>;
    internal: Map<PluginName, DiscoveredPluginInternal>;
  };
}

/** @internal */
export interface PluginsServiceStart {
  contracts: Map<PluginName, unknown>;
}

/** @internal */
export interface PluginsServiceSetupDeps {
  elasticsearch: ElasticsearchServiceSetup;
  http: HttpServiceSetup;
}

/** @internal */
export interface PluginsServiceStartDeps {} // eslint-disable-line @typescript-eslint/no-empty-interface

/** @internal */
export class PluginsService implements CoreService<PluginsServiceSetup, PluginsServiceStart> {
  private readonly log: Logger;
  private readonly pluginsSystem: PluginsSystem;
  private pluginDefinitions?: DiscoveredPluginsDefinitions;

  constructor(private readonly coreContext: CoreContext) {
    this.log = coreContext.logger.get('plugins-service');
    this.pluginsSystem = new PluginsSystem(coreContext);
  }

  public async preSetup(devPluginPaths: ReadonlyArray<string> = []) {
    const { env, logger } = this.coreContext;
    this.pluginDefinitions = await discover(env.pluginSearchPaths, devPluginPaths, env, logger);
    return this.pluginDefinitions;
  }

  public async setup(deps: PluginsServiceSetupDeps) {
    if (!this.pluginDefinitions) {
      throw new Error('pre-setup has not been run');
    }
    this.log.debug('Setting up plugins service');
    this.handleDiscoveryErrors(this.pluginDefinitions.errors);

    const plugins = this.pluginDefinitions.pluginDefinitions.map(
      ({ path, manifest }) =>
        new PluginWrapper(
          path,
          manifest,
          createPluginInitializerContext(this.coreContext, manifest)
        )
    );
    await this.handleDiscoveredPlugins(plugins);

    const config = await this.coreContext.configService
      .atPath('plugins', PluginsConfig)
      .pipe(first())
      .toPromise();

    if (!config.initialize || this.coreContext.env.isDevClusterMaster) {
      this.log.info('Plugin initialization disabled.');
      return {
        contracts: new Map(),
        uiPlugins: this.pluginsSystem.uiPlugins(),
      };
    }

    return {
      contracts: await this.pluginsSystem.setupPlugins(deps),
      uiPlugins: this.pluginsSystem.uiPlugins(),
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

  private handleDiscoveryErrors(discoveryErrors: ReadonlyArray<PluginDiscoveryError>) {
    // At this stage we report only errors that can occur when new platform plugin
    // manifest is present, otherwise we can't be sure that the plugin is for the new
    // platform and let legacy platform to handle it.
    const errorTypesToReport = [
      PluginDiscoveryErrorType.IncompatibleVersion,
      PluginDiscoveryErrorType.InvalidManifest,
      PluginDiscoveryErrorType.InvalidConfigSchema,
    ];

    const errors = discoveryErrors.filter(error => errorTypesToReport.includes(error.type));
    if (errors.length > 0) {
      errors.forEach(pluginError => this.log.error(pluginError));

      throw new Error(
        `Failed to initialize plugins:${errors.map(err => `\n\t${err.message}`).join('')}`
      );
    }
  }

  private async handleDiscoveredPlugins(plugins: ReadonlyArray<PluginWrapper>) {
    const pluginEnableStatuses = new Map<
      PluginName,
      { plugin: PluginWrapper; isEnabled: boolean }
    >();
    for (const plugin of plugins) {
      const isEnabled = await this.coreContext.configService.isEnabledAtPath(plugin.configPath);

      if (pluginEnableStatuses.has(plugin.name)) {
        throw new Error(`Plugin with id "${plugin.name}" is already registered!`);
      }

      pluginEnableStatuses.set(plugin.name, { plugin, isEnabled });
    }

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
    pluginEnableStatuses: Map<PluginName, { plugin: PluginWrapper; isEnabled: boolean }>
  ): boolean {
    const pluginInfo = pluginEnableStatuses.get(pluginName);
    return (
      pluginInfo !== undefined &&
      pluginInfo.isEnabled &&
      pluginInfo.plugin.requiredPlugins.every(dependencyName =>
        this.shouldEnablePlugin(dependencyName, pluginEnableStatuses)
      )
    );
  }
}
