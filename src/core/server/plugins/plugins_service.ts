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
import { filter, first, mergeMap, tap, toArray } from 'rxjs/operators';
import { CoreContext, CoreService } from '../../types';
import { ElasticsearchServiceStart } from '../elasticsearch';
import { Logger } from '../logging';
import { discover, PluginDiscoveryError, PluginDiscoveryErrorType } from './discovery';
import { Plugin, PluginName } from './plugin';
import { PluginsConfig } from './plugins_config';
import { PluginsSystem } from './plugins_system';

/** @internal */
export type PluginsServiceStart = Map<PluginName, unknown>;

/** @internal */
export interface PluginsServiceStartDeps {
  elasticsearch: ElasticsearchServiceStart;
}

/** @internal */
export class PluginsService implements CoreService<PluginsServiceStart> {
  private readonly log: Logger;
  private readonly pluginsSystem: PluginsSystem;

  constructor(private readonly coreContext: CoreContext) {
    this.log = coreContext.logger.get('plugins-service');
    this.pluginsSystem = new PluginsSystem(coreContext);
  }

  public async start(deps: PluginsServiceStartDeps) {
    this.log.debug('Starting plugins service');

    const config = await this.coreContext.configService
      .atPath('plugins', PluginsConfig)
      .pipe(first())
      .toPromise();

    const { error$, plugin$ } = discover(config, this.coreContext);
    await this.handleDiscoveryErrors(error$);
    await this.handleDiscoveredPlugins(plugin$);

    if (!config.initialize || this.coreContext.env.isDevClusterMaster) {
      this.log.info('Plugin initialization disabled.');
      return new Map();
    }

    return await this.pluginsSystem.startPlugins(deps);
  }

  public async stop() {
    this.log.debug('Stopping plugins service');
    await this.pluginsSystem.stopPlugins();
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

  private async handleDiscoveredPlugins(plugin$: Observable<Plugin>) {
    const pluginEnableStatuses = new Map<PluginName, { plugin: Plugin; isEnabled: boolean }>();
    await plugin$
      .pipe(
        mergeMap(async plugin => {
          const isEnabled = await this.coreContext.configService.isEnabledAtPath(plugin.configPath);

          if (pluginEnableStatuses.has(plugin.name)) {
            throw new Error(`Plugin with id "${plugin.name}" is already registered!`);
          }

          pluginEnableStatuses.set(plugin.name, {
            plugin,
            isEnabled,
          });
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
    pluginEnableStatuses: Map<PluginName, { plugin: Plugin; isEnabled: boolean }>
  ): boolean {
    const pluginInfo = pluginEnableStatuses.get(pluginName);
    return (
      pluginInfo !== undefined &&
      pluginInfo.isEnabled &&
      pluginInfo.plugin.requiredDependencies.every(dependencyName =>
        this.shouldEnablePlugin(dependencyName, pluginEnableStatuses)
      )
    );
  }
}
