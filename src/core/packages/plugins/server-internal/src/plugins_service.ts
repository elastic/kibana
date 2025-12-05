/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import type { Observable } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { filter, map, tap, toArray } from 'rxjs';
import { getFlattenedObject } from '@kbn/std';

import type { Logger } from '@kbn/logging';
import type { IConfigService } from '@kbn/config';
import type { CoreContext, CoreService } from '@kbn/core-base-server-internal';
import { type PluginName, PluginType } from '@kbn/core-base-common';
import type { InternalEnvironmentServicePreboot } from '@kbn/core-environment-server-internal';
import type { InternalNodeServicePreboot } from '@kbn/core-node-server-internal';
import type { InternalPluginInfo, UiPlugins } from '@kbn/core-plugins-base-server-internal';
import type {
  InternalCorePreboot,
  InternalCoreSetup,
  InternalCoreStart,
} from '@kbn/core-lifecycle-server-internal';
import type { PluginConfigDescriptor } from '@kbn/core-plugins-server';
import type { DiscoveredPlugin } from '@kbn/core-base-common';
import type { PluginDiscoveryError } from './discovery';
import { discover, PluginDiscoveryErrorType } from './discovery';
import type { PluginWrapper } from './plugin';

import type { PluginDependencies } from './types';
import type { PluginsConfigType } from './plugins_config';
import { PluginsConfig } from './plugins_config';
import { PluginsSystem } from './plugins_system';
import { createBrowserConfig } from './create_browser_config';
import { NodeRemoteService } from '@kbn/core/packages/node/server';

/** @internal */
export type DiscoveredPlugins = {
  [key in PluginType]: {
    pluginTree: PluginDependencies;
    pluginPaths: string[];
    uiPlugins: UiPlugins;
  };
};

/** @internal */
export interface InternalPluginsServiceSetup {
  /** Indicates whether or not plugins were initialized. */
  initialized: boolean;
  /** Setup contracts returned by plugins. */
  contracts: Map<PluginName, unknown>;
}

/** @internal */
export interface InternalPluginsServiceStart {
  /** Start contracts returned by plugins. */
  contracts: Map<PluginName, unknown>;
}

/** @internal */
export type PluginsServicePrebootSetupDeps = InternalCorePreboot;

/** @internal */
export type PluginsServiceSetupDeps = InternalCoreSetup;

/** @internal */
export type PluginsServiceStartDeps = InternalCoreStart;

/** @internal */
export interface PluginsServiceDiscoverDeps {
  environment: InternalEnvironmentServicePreboot;
  node: InternalNodeServicePreboot;
}

/** @internal */
export class PluginsService
  implements CoreService<InternalPluginsServiceSetup, InternalPluginsServiceStart>
{
  private readonly log: Logger;
  private readonly prebootPluginsSystem: PluginsSystem<PluginType.preboot>;
  private arePrebootPluginsStopped = false;
  private readonly prebootUiPluginInternalInfo = new Map<PluginName, InternalPluginInfo>();
  private readonly standardPluginsSystem: PluginsSystem<PluginType.standard>;
  private readonly standardUiPluginInternalInfo = new Map<PluginName, InternalPluginInfo>();
  private readonly configService: IConfigService;
  private readonly config$: Observable<PluginsConfig>;
  private readonly pluginConfigDescriptors = new Map<PluginName, PluginConfigDescriptor>();
  private readonly pluginConfigUsageDescriptors = new Map<string, Record<string, any | any[]>>();

  constructor(private readonly coreContext: CoreContext) {
    this.log = coreContext.logger.get('plugins-service');
    this.configService = coreContext.configService;
    this.config$ = coreContext.configService
      .atPath<PluginsConfigType>('plugins')
      .pipe(map((rawConfig) => new PluginsConfig(rawConfig, coreContext.env)));
    this.prebootPluginsSystem = new PluginsSystem(this.coreContext, PluginType.preboot);
    this.standardPluginsSystem = new PluginsSystem(this.coreContext, PluginType.standard);
  }

  public async discover({
    environment,
    node,
  }: PluginsServiceDiscoverDeps): Promise<DiscoveredPlugins> {
    const config = await firstValueFrom(this.config$);

    const { error$, plugin$ } = discover({
      config,
      coreContext: this.coreContext,
      instanceInfo: {
        uuid: environment.instanceUuid,
      },
      nodeInfo: {
        roles: node.roles
      },
    });

    await this.handleDiscoveryErrors(error$);
    await this.handleDiscoveredPlugins(plugin$, node.service, node.remoteServices);

    const prebootUiPlugins = this.prebootPluginsSystem.uiPlugins();
    const standardUiPlugins = this.standardPluginsSystem.uiPlugins();
    return {
      preboot: {
        pluginPaths: this.prebootPluginsSystem.getPlugins().map((plugin) => plugin.path),
        pluginTree: this.prebootPluginsSystem.getPluginDependencies(),
        uiPlugins: {
          internal: this.prebootUiPluginInternalInfo,
          public: prebootUiPlugins,
          browserConfigs: this.generateUiPluginsConfigs(prebootUiPlugins),
        },
      },
      standard: {
        pluginPaths: this.standardPluginsSystem.getPlugins().map((plugin) => plugin.path),
        pluginTree: this.standardPluginsSystem.getPluginDependencies(),
        uiPlugins: {
          internal: this.standardUiPluginInternalInfo,
          public: standardUiPlugins,
          browserConfigs: this.generateUiPluginsConfigs(standardUiPlugins),
        },
      },
    };
  }

  public getExposedPluginConfigsToUsage() {
    return this.pluginConfigUsageDescriptors;
  }

  public async preboot(deps: PluginsServicePrebootSetupDeps) {
    this.log.debug('Prebooting plugins service');

    const config = await firstValueFrom(this.config$);
    if (config.initialize) {
      await this.prebootPluginsSystem.setupPlugins(deps);
    } else {
      this.log.info(
        'Skipping `setup` for `preboot` plugins since plugin initialization is disabled.'
      );
    }
  }

  public async setup(deps: PluginsServiceSetupDeps) {
    this.log.debug('Setting up plugins service');

    const config = await firstValueFrom(this.config$);

    let contracts = new Map<PluginName, unknown>();
    if (config.initialize) {
      contracts = await this.standardPluginsSystem.setupPlugins(deps);
    } else {
      this.log.info(
        'Skipping `setup` for `standard` plugins since plugin initialization is disabled.'
      );
    }

    return {
      initialized: config.initialize,
      contracts,
    };
  }

  public async start(deps: PluginsServiceStartDeps) {
    this.log.debug('Plugins service starts plugins');

    const config = await firstValueFrom(this.config$);
    if (!config.initialize) {
      this.log.info(
        'Skipping `start` for `standard` plugins since plugin initialization is disabled.'
      );
      return { contracts: new Map() };
    }

    await this.prebootPluginsSystem.stopPlugins();
    this.arePrebootPluginsStopped = true;

    const contracts = await this.standardPluginsSystem.startPlugins(deps);
    return { contracts };
  }

  public async stop() {
    this.log.debug('Stopping plugins service');

    if (!this.arePrebootPluginsStopped) {
      this.arePrebootPluginsStopped = true;
      await this.prebootPluginsSystem.stopPlugins();
    }

    await this.standardPluginsSystem.stopPlugins();
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
            this.configService
              .atPath(plugin.configPath)
              .pipe(map((config: any) => createBrowserConfig(config, configDescriptor))),
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

    const errors = await firstValueFrom(
      error$.pipe(
        filter((error) => errorTypesToReport.includes(error.type)),
        tap((pluginError) => this.log.error(pluginError)),
        toArray()
      )
    );
    if (errors.length > 0) {
      throw new Error(
        `Failed to initialize plugins:${errors.map((err) => `\n\t${err.message}`).join('')}`
      );
    }
  }

  private async handleDiscoveredPlugins(plugin$: Observable<PluginWrapper>, service?: string, remoteServices?: NodeRemoteService[]) {
    const pluginEnableStatuses = new Map<
      PluginName,
      { plugin: PluginWrapper; isEnabled: boolean }
    >();
    let plugins = await firstValueFrom(plugin$.pipe(toArray()));
    
    if (service != null) {
      plugins = onlyServiceAndDependencies(plugins, service);
    }

    if (remoteServices != null) {
      plugins = excludeServices(plugins, remoteServices.map(rs => rs.name));
    }

    // Register config descriptors and deprecations
    for (const plugin of plugins) {
      const configDescriptor = plugin.getConfigDescriptor();
      if (configDescriptor) {
        this.pluginConfigDescriptors.set(plugin.name, configDescriptor);
        if (configDescriptor.deprecations) {
          this.coreContext.configService.addDeprecationProvider(
            plugin.configPath,
            configDescriptor.deprecations
          );
        }
        if (configDescriptor.exposeToUsage) {
          this.pluginConfigUsageDescriptors.set(
            Array.isArray(plugin.configPath) ? plugin.configPath.join('.') : plugin.configPath,
            getFlattenedObject(configDescriptor.exposeToUsage)
          );
        }
        if (configDescriptor.dynamicConfig) {
          const configKeys = Object.entries(getFlattenedObject(configDescriptor.dynamicConfig))
            .filter(([, value]) => value === true)
            .map(([key]) => key);
          if (configKeys.length > 0) {
            this.coreContext.configService.addDynamicConfigPaths(plugin.configPath, configKeys);
          }
        }
        this.coreContext.configService.setSchema(plugin.configPath, configDescriptor.schema);
      }
    }

    const config = await firstValueFrom(this.config$);
    const enableAllPlugins = config.shouldEnableAllPlugins;
    if (enableAllPlugins) {
      this.log.warn('Detected override configuration; will enable all plugins');
    }

    // Validate config and handle enabled statuses.
    // NOTE: We can't do both in the same previous loop because some plugins' deprecations may affect others.
    // Hence, we need all the deprecations to be registered before accessing any config parameter.
    for (const plugin of plugins) {
      const isEnabled =
        enableAllPlugins ||
        (await this.coreContext.configService.isEnabledAtPath(plugin.configPath));

      if (pluginEnableStatuses.has(plugin.name)) {
        throw new Error(`Plugin with id "${plugin.name}" is already registered!`);
      }

      if (plugin.includesUiPlugin) {
        const uiPluginInternalInfo =
          plugin.manifest.type === PluginType.preboot
            ? this.prebootUiPluginInternalInfo
            : this.standardUiPluginInternalInfo;
        uiPluginInternalInfo.set(plugin.name, {
          requiredBundles: plugin.requiredBundles,
          version: plugin.manifest.version,
          publicTargetDir: Path.resolve(plugin.path, 'target/public'),
          publicAssetsDir: Path.resolve(plugin.path, 'public/assets'),
        });
      }

      pluginEnableStatuses.set(plugin.name, { plugin, isEnabled });
    }

    // Add the plugins to the Plugin System if enabled and its dependencies are met
    const disabledPlugins = [];
    const disabledDependants = [];
    const disabledDependantsCauses = new Set<string>();
    const pluginDependenciesAvailibilityCache = new Map<PluginName, AllDependenciesAvailableResult>();

    
    for (const [pluginName, { plugin, isEnabled }] of pluginEnableStatuses) {
      this.validatePluginDependencies(plugin, pluginEnableStatuses);

      const allDependenciesAvailableResult = allDependenciesAvailable({
        pluginName,
        pluginEnableStatuses,
        cache: pluginDependenciesAvailibilityCache,
      });

      if (allDependenciesAvailableResult.success) {
        if (plugin.manifest.type === PluginType.preboot) {
          this.prebootPluginsSystem.addPlugin(plugin);
        } else {
          this.standardPluginsSystem.addPlugin(plugin);
        }
      } else if (isEnabled) {
        disabledDependants.push(pluginName);
        allDependenciesAvailableResult.missingOrIncompatibleDependencies.forEach((dependency) =>
          disabledDependantsCauses.add(dependency)
        );
      } else {
        disabledPlugins.push(pluginName);
      }
    }

    this.log.debug(`Discovered ${pluginEnableStatuses.size} plugins.`);
    if (disabledPlugins.length) {
      this.log.info(`The following plugins are disabled: "${disabledPlugins}".`);
    }
    if (disabledDependants.length) {
      this.log.info(
        `Plugins "${disabledDependants}" have been disabled since the following direct or transitive dependencies are missing, disabled, or have incompatible types: [${Array.from(
          disabledDependantsCauses
        )}].`
      );
    }
  }

  /** Throws an error if the plugin's dependencies are invalid. */
  private validatePluginDependencies(
    plugin: PluginWrapper,
    pluginEnableStatuses: Map<PluginName, { plugin: PluginWrapper; isEnabled: boolean }>
  ) {
    const { name, manifest, requiredBundles, requiredPlugins } = plugin;

    // validate that `requiredBundles` ids point to a discovered plugin which `includesUiPlugin`
    for (const requiredBundleId of requiredBundles) {
      if (!pluginEnableStatuses.has(requiredBundleId)) {
        throw new Error(
          `Plugin bundle with id "${requiredBundleId}" is required by plugin "${name}" but it is missing.`
        );
      }

      const requiredPlugin = pluginEnableStatuses.get(requiredBundleId)!.plugin;
      if (!requiredPlugin.includesUiPlugin) {
        throw new Error(
          `Plugin bundle with id "${requiredBundleId}" is required by plugin "${name}" but it doesn't have a UI bundle.`
        );
      }

      if (requiredPlugin.manifest.type !== plugin.manifest.type) {
        throw new Error(
          `Plugin bundle with id "${requiredBundleId}" is required by plugin "${name}" and expected to have "${manifest.type}" type, but its type is "${requiredPlugin.manifest.type}".`
        );
      }
    }

    // validate that OSS plugins do not have required dependencies on X-Pack plugins
    if (plugin.source === 'oss') {
      for (const id of [...requiredPlugins, ...requiredBundles]) {
        const requiredPlugin = pluginEnableStatuses.get(id);
        if (requiredPlugin && requiredPlugin.plugin.source === 'x-pack') {
          throw new Error(
            `X-Pack plugin or bundle with id "${id}" is required by OSS plugin "${name}", which is prohibited. Consider making this an optional dependency instead.`
          );
        }
      }
    }
  }
}

type AllDependenciesAvailableResult =
  | { success: true }
  | { success: false; missingOrIncompatibleDependencies: string[] };

function allDependenciesAvailable({
  pluginName,
  pluginEnableStatuses,
  cache,
  parents = [],
}: {
  pluginName: PluginName;
  pluginEnableStatuses: Map<PluginName, { plugin: PluginWrapper; isEnabled: boolean }>;
  cache: Map<PluginName, AllDependenciesAvailableResult>;
  parents?: PluginName[];
}): AllDependenciesAvailableResult {
  const cachedValue = cache.get(pluginName);
  if (cachedValue) {
    return cachedValue;
  }

  const pluginInfo = pluginEnableStatuses.get(pluginName);

  let result: AllDependenciesAvailableResult;
  if (pluginInfo === undefined || !pluginInfo.isEnabled) {
    result = {
      success: false,
      missingOrIncompatibleDependencies: [],
    };
  } else {
    const missingOrIncompatibleDependencies = pluginInfo.plugin.requiredPlugins
      .filter((dep) => !parents.includes(dep))
      .filter(
        (dependencyName) =>
          pluginEnableStatuses.get(dependencyName)?.plugin.manifest.type !==
            pluginInfo.plugin.manifest.type ||
          !allDependenciesAvailable({
            pluginName: dependencyName,
            pluginEnableStatuses,
            parents: [...parents, pluginName],
            cache,
          }).success
      );

    if (missingOrIncompatibleDependencies.length === 0) {
      result = {
        success: true,
      };
    } else {
      result = {
        success: false,
        missingOrIncompatibleDependencies,
      };
    }
  }

  cache.set(pluginName, result);
  return result;
}

function onlyServiceAndDependencies(allPlugins: PluginWrapper[], service: string) : PluginWrapper[] {
  // start with only the plugins that are explicit for this service
  const servicePlugins = new Set(allPlugins.filter(p => p.manifest.service == service));

  // prepare a map, so we can lookup a plugin by just its name
  const map = allPlugins.reduce((m, p) => { m.set(p.name, p); return m; }, new Map<string, PluginWrapper>());

  // we're going to iterate over the set of servicePlugins. for each plugin, we are going to add its
  // dependencies to the servicePlugins set using the map. by the end of this process, we'll
  // have just the plugins and the dependencies
  for (const servicePlugin of servicePlugins) {
    for (const dep of servicePlugin.optionalPlugins) {
      servicePlugins.add(map.get(dep)!);
    }

    for (const dep of servicePlugin.requiredPlugins) {
      servicePlugins.add(map.get(dep)!);
    }

    for (const dep of servicePlugin.requiredBundles) {
      servicePlugins.add(map.get(dep)!);
    }
  }

  return Array.from(servicePlugins);
}

function excludeServices(allPlugins: PluginWrapper[], services: string[]) {
  return allPlugins.filter(p => !services.includes(p.name) );
}