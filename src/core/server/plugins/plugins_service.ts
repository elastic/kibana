/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import { Observable } from 'rxjs';
import { concatMap, filter, first, map, tap, toArray } from 'rxjs/operators';
import { getFlattenedObject } from '@kbn/std';

import { CoreService } from '../../types';
import { CoreContext } from '../core_context';
import { Logger } from '../logging';
import { discover, PluginDiscoveryError, PluginDiscoveryErrorType } from './discovery';
import { PluginWrapper } from './plugin';
import {
  DiscoveredPlugin,
  InternalPluginInfo,
  PluginConfigDescriptor,
  PluginDependencies,
  PluginName,
  PluginType,
} from './types';
import { PluginsConfig, PluginsConfigType } from './plugins_config';
import { PluginsSystem } from './plugins_system';
import { createBrowserConfig } from './create_browser_config';
import { InternalCorePreboot, InternalCoreSetup, InternalCoreStart } from '../internal_types';
import { IConfigService } from '../config';
import { InternalEnvironmentServicePreboot } from '../environment';

/** @internal */
export type DiscoveredPlugins = {
  [key in PluginType]: {
    pluginTree: PluginDependencies;
    pluginPaths: string[];
    uiPlugins: UiPlugins;
  };
};

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
export type PluginsServicePrebootSetupDeps = InternalCorePreboot;

/** @internal */
export type PluginsServiceSetupDeps = InternalCoreSetup;

/** @internal */
export type PluginsServiceStartDeps = InternalCoreStart;

/** @internal */
export interface PluginsServiceDiscoverDeps {
  environment: InternalEnvironmentServicePreboot;
}

/** @internal */
export class PluginsService implements CoreService<PluginsServiceSetup, PluginsServiceStart> {
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

  public async discover({ environment }: PluginsServiceDiscoverDeps): Promise<DiscoveredPlugins> {
    const config = await this.config$.pipe(first()).toPromise();

    const { error$, plugin$ } = discover(config, this.coreContext, {
      uuid: environment.instanceUuid,
    });

    await this.handleDiscoveryErrors(error$);
    await this.handleDiscoveredPlugins(plugin$);

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

    const config = await this.config$.pipe(first()).toPromise();
    if (config.initialize) {
      await this.prebootPluginsSystem.setupPlugins(deps);
      this.registerPluginStaticDirs(deps, this.prebootUiPluginInternalInfo);
    } else {
      this.log.info(
        'Skipping `setup` for `preboot` plugins since plugin initialization is disabled.'
      );
    }
  }

  public async setup(deps: PluginsServiceSetupDeps) {
    this.log.debug('Setting up plugins service');

    const config = await this.config$.pipe(first()).toPromise();

    let contracts = new Map<PluginName, unknown>();
    if (config.initialize) {
      contracts = await this.standardPluginsSystem.setupPlugins(deps);
      this.registerPluginStaticDirs(deps, this.standardUiPluginInternalInfo);
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

    const config = await this.config$.pipe(first()).toPromise();
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
      this.arePrebootPluginsStopped = false;
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
              .pipe(
                map((config: any) => createBrowserConfig(config, configDescriptor.exposeToBrowser!))
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
        concatMap(async (plugin) => {
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
            this.coreContext.configService.setSchema(plugin.configPath, configDescriptor.schema);
          }
          const isEnabled = await this.coreContext.configService.isEnabledAtPath(plugin.configPath);

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
        })
      )
      .toPromise();

    for (const [pluginName, { plugin, isEnabled }] of pluginEnableStatuses) {
      this.validatePluginDependencies(plugin, pluginEnableStatuses);

      const pluginEnablement = this.shouldEnablePlugin(pluginName, pluginEnableStatuses);

      if (pluginEnablement.enabled) {
        if (plugin.manifest.type === PluginType.preboot) {
          this.prebootPluginsSystem.addPlugin(plugin);
        } else {
          this.standardPluginsSystem.addPlugin(plugin);
        }
      } else if (isEnabled) {
        this.log.info(
          `Plugin "${pluginName}" has been disabled since the following direct or transitive dependencies are missing, disabled, or have incompatible types: [${pluginEnablement.missingOrIncompatibleDependencies.join(
            ', '
          )}]`
        );
      } else {
        this.log.info(`Plugin "${pluginName}" is disabled.`);
      }
    }

    this.log.debug(`Discovered ${pluginEnableStatuses.size} plugins.`);
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

  private shouldEnablePlugin(
    pluginName: PluginName,
    pluginEnableStatuses: Map<PluginName, { plugin: PluginWrapper; isEnabled: boolean }>,
    parents: PluginName[] = []
  ): { enabled: true } | { enabled: false; missingOrIncompatibleDependencies: string[] } {
    const pluginInfo = pluginEnableStatuses.get(pluginName);

    if (pluginInfo === undefined || !pluginInfo.isEnabled) {
      return {
        enabled: false,
        missingOrIncompatibleDependencies: [],
      };
    }

    const missingOrIncompatibleDependencies = pluginInfo.plugin.requiredPlugins
      .filter((dep) => !parents.includes(dep))
      .filter(
        (dependencyName) =>
          pluginEnableStatuses.get(dependencyName)?.plugin.manifest.type !==
            pluginInfo.plugin.manifest.type ||
          !this.shouldEnablePlugin(dependencyName, pluginEnableStatuses, [...parents, pluginName])
            .enabled
      );

    if (missingOrIncompatibleDependencies.length === 0) {
      return {
        enabled: true,
      };
    }

    return {
      enabled: false,
      missingOrIncompatibleDependencies,
    };
  }

  private registerPluginStaticDirs(
    deps: PluginsServiceSetupDeps | PluginsServicePrebootSetupDeps,
    uiPluginInternalInfo: Map<PluginName, InternalPluginInfo>
  ) {
    for (const [pluginName, pluginInfo] of uiPluginInternalInfo) {
      deps.http.registerStaticDir(
        `/plugins/${pluginName}/assets/{path*}`,
        pluginInfo.publicAssetsDir
      );
    }
  }
}
