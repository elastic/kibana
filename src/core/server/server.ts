/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import apm from 'elastic-apm-node';
import { config as pathConfig } from '@kbn/utils';
import {
  ConfigService,
  Env,
  RawConfigurationProvider,
  coreDeprecationProvider,
  ensureValidConfiguration,
} from './config';
import { CoreApp } from './core_app';
import { I18nService } from './i18n';
import { ElasticsearchService } from './elasticsearch';
import { HttpService } from './http';
import { HttpResourcesService } from './http_resources';
import { RenderingService } from './rendering';
import { LegacyService } from './legacy';
import { Logger, LoggerFactory, LoggingService, ILoggingSystem } from './logging';
import { UiSettingsService } from './ui_settings';
import { PluginsService, config as pluginsConfig } from './plugins';
import { SavedObjectsService, SavedObjectsServiceStart } from './saved_objects';
import { MetricsService, opsConfig } from './metrics';
import { CapabilitiesService } from './capabilities';
import { EnvironmentService, config as pidConfig } from './environment';
// do not try to shorten the import to `./status`, it will break server test mocking
import { StatusService } from './status/status_service';

import { config as cspConfig } from './csp';
import { config as elasticsearchConfig } from './elasticsearch';
import { config as httpConfig } from './http';
import { config as loggingConfig } from './logging';
import { config as kibanaConfig } from './kibana_config';
import { savedObjectsConfig, savedObjectsMigrationConfig } from './saved_objects';
import { config as uiSettingsConfig } from './ui_settings';
import { config as statusConfig } from './status';
import { config as i18nConfig } from './i18n';
import { ContextService } from './context';
import { RequestHandlerContext } from '.';
import { InternalCoreSetup, InternalCoreStart, ServiceConfigDescriptor } from './internal_types';
import { CoreUsageDataService } from './core_usage_data';
import { DeprecationsService } from './deprecations';
import { CoreRouteHandlerContext } from './core_route_handler_context';
import { config as externalUrlConfig } from './external_url';

const coreId = Symbol('core');
const rootConfigPath = '';

export class Server {
  public readonly configService: ConfigService;
  private readonly capabilities: CapabilitiesService;
  private readonly context: ContextService;
  private readonly elasticsearch: ElasticsearchService;
  private readonly http: HttpService;
  private readonly rendering: RenderingService;
  private readonly legacy: LegacyService;
  private readonly log: Logger;
  private readonly plugins: PluginsService;
  private readonly savedObjects: SavedObjectsService;
  private readonly uiSettings: UiSettingsService;
  private readonly environment: EnvironmentService;
  private readonly metrics: MetricsService;
  private readonly httpResources: HttpResourcesService;
  private readonly status: StatusService;
  private readonly logging: LoggingService;
  private readonly coreApp: CoreApp;
  private readonly coreUsageData: CoreUsageDataService;
  private readonly i18n: I18nService;
  private readonly deprecations: DeprecationsService;

  private readonly savedObjectsStartPromise: Promise<SavedObjectsServiceStart>;
  private resolveSavedObjectsStartPromise?: (value: SavedObjectsServiceStart) => void;

  #pluginsInitialized?: boolean;
  private coreStart?: InternalCoreStart;
  private readonly logger: LoggerFactory;

  constructor(
    rawConfigProvider: RawConfigurationProvider,
    public readonly env: Env,
    private readonly loggingSystem: ILoggingSystem
  ) {
    this.logger = this.loggingSystem.asLoggerFactory();
    this.log = this.logger.get('server');
    this.configService = new ConfigService(rawConfigProvider, env, this.logger);

    const core = { coreId, configService: this.configService, env, logger: this.logger };
    this.context = new ContextService(core);
    this.http = new HttpService(core);
    this.rendering = new RenderingService(core);
    this.plugins = new PluginsService(core);
    this.legacy = new LegacyService(core);
    this.elasticsearch = new ElasticsearchService(core);
    this.savedObjects = new SavedObjectsService(core);
    this.uiSettings = new UiSettingsService(core);
    this.capabilities = new CapabilitiesService(core);
    this.environment = new EnvironmentService(core);
    this.metrics = new MetricsService(core);
    this.status = new StatusService(core);
    this.coreApp = new CoreApp(core);
    this.httpResources = new HttpResourcesService(core);
    this.logging = new LoggingService(core);
    this.coreUsageData = new CoreUsageDataService(core);
    this.i18n = new I18nService(core);
    this.deprecations = new DeprecationsService(core);

    this.savedObjectsStartPromise = new Promise((resolve) => {
      this.resolveSavedObjectsStartPromise = resolve;
    });
  }

  public async setup() {
    this.log.debug('setting up server');
    const setupTransaction = apm.startTransaction('server_setup', 'kibana_platform');

    const environmentSetup = await this.environment.setup();

    // Discover any plugins before continuing. This allows other systems to utilize the plugin dependency graph.
    const { pluginTree, pluginPaths, uiPlugins } = await this.plugins.discover({
      environment: environmentSetup,
    });

    // Immediately terminate in case of invalid configuration
    // This needs to be done after plugin discovery
    await ensureValidConfiguration(this.configService);

    const contextServiceSetup = this.context.setup({
      pluginDependencies: new Map([...pluginTree.asOpaqueIds]),
    });

    const httpSetup = await this.http.setup({
      context: contextServiceSetup,
    });

    // setup i18n prior to any other service, to have translations ready
    const i18nServiceSetup = await this.i18n.setup({ http: httpSetup, pluginPaths });

    const capabilitiesSetup = this.capabilities.setup({ http: httpSetup });

    const elasticsearchServiceSetup = await this.elasticsearch.setup({
      http: httpSetup,
    });

    const metricsSetup = await this.metrics.setup({ http: httpSetup });

    const coreUsageDataSetup = this.coreUsageData.setup({
      http: httpSetup,
      metrics: metricsSetup,
      savedObjectsStartPromise: this.savedObjectsStartPromise,
      changedDeprecatedConfigPath$: this.configService.getDeprecatedConfigPath$(),
    });

    const savedObjectsSetup = await this.savedObjects.setup({
      http: httpSetup,
      elasticsearch: elasticsearchServiceSetup,
      coreUsageData: coreUsageDataSetup,
    });

    const uiSettingsSetup = await this.uiSettings.setup({
      http: httpSetup,
      savedObjects: savedObjectsSetup,
    });

    const statusSetup = await this.status.setup({
      elasticsearch: elasticsearchServiceSetup,
      pluginDependencies: pluginTree.asNames,
      savedObjects: savedObjectsSetup,
      environment: environmentSetup,
      http: httpSetup,
      metrics: metricsSetup,
    });

    const renderingSetup = await this.rendering.setup({
      http: httpSetup,
      status: statusSetup,
      uiPlugins,
    });

    const httpResourcesSetup = this.httpResources.setup({
      http: httpSetup,
      rendering: renderingSetup,
    });

    const loggingSetup = this.logging.setup({
      loggingSystem: this.loggingSystem,
    });

    const deprecationsSetup = this.deprecations.setup({
      http: httpSetup,
    });

    const coreSetup: InternalCoreSetup = {
      capabilities: capabilitiesSetup,
      context: contextServiceSetup,
      elasticsearch: elasticsearchServiceSetup,
      environment: environmentSetup,
      http: httpSetup,
      i18n: i18nServiceSetup,
      savedObjects: savedObjectsSetup,
      status: statusSetup,
      uiSettings: uiSettingsSetup,
      rendering: renderingSetup,
      httpResources: httpResourcesSetup,
      logging: loggingSetup,
      metrics: metricsSetup,
      deprecations: deprecationsSetup,
    };

    const pluginsSetup = await this.plugins.setup(coreSetup);
    this.#pluginsInitialized = pluginsSetup.initialized;

    await this.legacy.setup({
      http: httpSetup,
    });

    this.registerCoreContext(coreSetup);
    this.coreApp.setup(coreSetup, uiPlugins);

    setupTransaction?.end();
    return coreSetup;
  }

  public async start() {
    this.log.debug('starting server');
    const startTransaction = apm.startTransaction('server_start', 'kibana_platform');

    const elasticsearchStart = await this.elasticsearch.start();
    const soStartSpan = startTransaction?.startSpan('saved_objects.migration', 'migration');
    const savedObjectsStart = await this.savedObjects.start({
      elasticsearch: elasticsearchStart,
      pluginsInitialized: this.#pluginsInitialized,
    });
    await this.resolveSavedObjectsStartPromise!(savedObjectsStart);

    soStartSpan?.end();
    const capabilitiesStart = this.capabilities.start();
    const uiSettingsStart = await this.uiSettings.start();
    const metricsStart = await this.metrics.start();
    const httpStart = this.http.getStartContract();
    const coreUsageDataStart = this.coreUsageData.start({
      elasticsearch: elasticsearchStart,
      savedObjects: savedObjectsStart,
      exposedConfigsToUsage: this.plugins.getExposedPluginConfigsToUsage(),
    });

    this.coreStart = {
      capabilities: capabilitiesStart,
      elasticsearch: elasticsearchStart,
      http: httpStart,
      metrics: metricsStart,
      savedObjects: savedObjectsStart,
      uiSettings: uiSettingsStart,
      coreUsageData: coreUsageDataStart,
    };

    await this.plugins.start(this.coreStart);

    await this.http.start();

    startTransaction?.end();

    return this.coreStart;
  }

  public async stop() {
    this.log.debug('stopping server');

    await this.legacy.stop();
    await this.http.stop(); // HTTP server has to stop before savedObjects and ES clients are closed to be able to gracefully attempt to resolve any pending requests
    await this.plugins.stop();
    await this.savedObjects.stop();
    await this.elasticsearch.stop();
    await this.uiSettings.stop();
    await this.rendering.stop();
    await this.metrics.stop();
    await this.status.stop();
    await this.logging.stop();
    this.deprecations.stop();
  }

  private registerCoreContext(coreSetup: InternalCoreSetup) {
    coreSetup.http.registerRouteHandlerContext(
      coreId,
      'core',
      (context, req, res): RequestHandlerContext['core'] => {
        return new CoreRouteHandlerContext(this.coreStart!, req);
      }
    );
  }

  public setupCoreConfig() {
    const configDescriptors: Array<ServiceConfigDescriptor<unknown>> = [
      pathConfig,
      cspConfig,
      elasticsearchConfig,
      externalUrlConfig,
      loggingConfig,
      httpConfig,
      pluginsConfig,
      kibanaConfig,
      savedObjectsConfig,
      savedObjectsMigrationConfig,
      uiSettingsConfig,
      opsConfig,
      statusConfig,
      pidConfig,
      i18nConfig,
    ];

    this.configService.addDeprecationProvider(rootConfigPath, coreDeprecationProvider);
    for (const descriptor of configDescriptors) {
      if (descriptor.deprecations) {
        this.configService.addDeprecationProvider(descriptor.path, descriptor.deprecations);
      }
      this.configService.setSchema(descriptor.path, descriptor.schema);
    }
  }
}
