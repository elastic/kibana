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
import { Logger, LoggerFactory, LoggingService, ILoggingSystem } from './logging';
import { UiSettingsService } from './ui_settings';
import { PluginsService, config as pluginsConfig } from './plugins';
import { SavedObjectsService, SavedObjectsServiceStart } from './saved_objects';
import { MetricsService, opsConfig } from './metrics';
import { CapabilitiesService } from './capabilities';
import { EnvironmentService, config as pidConfig } from './environment';
// do not try to shorten the import to `./status`, it will break server test mocking
import { StatusService } from './status/status_service';
import { ExecutionContextService } from './execution_context';
import { DocLinksService } from './doc_links';

import { config as cspConfig } from './csp';
import { config as elasticsearchConfig } from './elasticsearch';
import { config as httpConfig } from './http';
import { config as loggingConfig } from './logging';
import { savedObjectsConfig, savedObjectsMigrationConfig } from './saved_objects';
import { config as uiSettingsConfig } from './ui_settings';
import { config as statusConfig } from './status';
import { config as i18nConfig } from './i18n';
import { ContextService } from './context';
import {
  InternalCorePreboot,
  InternalCoreSetup,
  InternalCoreStart,
  ServiceConfigDescriptor,
} from './internal_types';
import { CoreUsageDataService } from './core_usage_data';
import { DeprecationsService, config as deprecationConfig } from './deprecations';
import { CoreRouteHandlerContext } from './core_route_handler_context';
import { config as externalUrlConfig } from './external_url';
import { config as executionContextConfig } from './execution_context';
import { PrebootCoreRouteHandlerContext } from './preboot_core_route_handler_context';
import { PrebootService } from './preboot';
import { DiscoveredPlugins } from './plugins';
import { AnalyticsService } from './analytics';

const coreId = Symbol('core');
const rootConfigPath = '';

export class Server {
  public readonly configService: ConfigService;
  private readonly analytics: AnalyticsService;
  private readonly capabilities: CapabilitiesService;
  private readonly context: ContextService;
  private readonly elasticsearch: ElasticsearchService;
  private readonly http: HttpService;
  private readonly rendering: RenderingService;
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
  private readonly executionContext: ExecutionContextService;
  private readonly prebootService: PrebootService;
  private readonly docLinks: DocLinksService;

  private readonly savedObjectsStartPromise: Promise<SavedObjectsServiceStart>;
  private resolveSavedObjectsStartPromise?: (value: SavedObjectsServiceStart) => void;

  #pluginsInitialized?: boolean;
  private coreStart?: InternalCoreStart;
  private discoveredPlugins?: DiscoveredPlugins;
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
    this.analytics = new AnalyticsService(core);
    this.context = new ContextService(core);
    this.http = new HttpService(core);
    this.rendering = new RenderingService(core);
    this.plugins = new PluginsService(core);
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
    this.executionContext = new ExecutionContextService(core);
    this.prebootService = new PrebootService(core);
    this.docLinks = new DocLinksService(core);

    this.savedObjectsStartPromise = new Promise((resolve) => {
      this.resolveSavedObjectsStartPromise = resolve;
    });
  }

  public async preboot() {
    this.log.debug('prebooting server');
    const prebootTransaction = apm.startTransaction('server-preboot', 'kibana-platform');

    const analyticsPreboot = this.analytics.preboot();

    const environmentPreboot = await this.environment.preboot();

    // Discover any plugins before continuing. This allows other systems to utilize the plugin dependency graph.
    this.discoveredPlugins = await this.plugins.discover({ environment: environmentPreboot });

    // Immediately terminate in case of invalid configuration. This needs to be done after plugin discovery. We also
    // silent deprecation warnings until `setup` stage where we'll validate config once again.
    await ensureValidConfiguration(this.configService, { logDeprecations: false });

    const { uiPlugins, pluginTree, pluginPaths } = this.discoveredPlugins.preboot;
    const contextServicePreboot = this.context.preboot({
      pluginDependencies: new Map([...pluginTree.asOpaqueIds]),
    });
    const httpPreboot = await this.http.preboot({ context: contextServicePreboot });

    // setup i18n prior to any other service, to have translations ready
    await this.i18n.preboot({ http: httpPreboot, pluginPaths });

    this.capabilities.preboot({ http: httpPreboot });
    const elasticsearchServicePreboot = await this.elasticsearch.preboot();
    const uiSettingsPreboot = await this.uiSettings.preboot();

    const renderingPreboot = await this.rendering.preboot({ http: httpPreboot, uiPlugins });
    const httpResourcesPreboot = this.httpResources.preboot({
      http: httpPreboot,
      rendering: renderingPreboot,
    });

    const loggingPreboot = this.logging.preboot({ loggingSystem: this.loggingSystem });

    const corePreboot: InternalCorePreboot = {
      analytics: analyticsPreboot,
      context: contextServicePreboot,
      elasticsearch: elasticsearchServicePreboot,
      http: httpPreboot,
      uiSettings: uiSettingsPreboot,
      httpResources: httpResourcesPreboot,
      logging: loggingPreboot,
      preboot: this.prebootService.preboot(),
    };

    await this.plugins.preboot(corePreboot);

    httpPreboot.registerRouteHandlerContext(coreId, 'core', (() => {
      return new PrebootCoreRouteHandlerContext(corePreboot);
    }) as any);

    this.coreApp.preboot(corePreboot, uiPlugins);

    prebootTransaction?.end();
    return corePreboot;
  }

  public async setup() {
    this.log.debug('setting up server');
    const setupTransaction = apm.startTransaction('server-setup', 'kibana-platform');

    const analyticsSetup = this.analytics.setup();

    const environmentSetup = this.environment.setup();

    // Configuration could have changed after preboot.
    await ensureValidConfiguration(this.configService);

    const { uiPlugins, pluginPaths, pluginTree } = this.discoveredPlugins!.standard;
    const contextServiceSetup = this.context.setup({
      pluginDependencies: new Map([...pluginTree.asOpaqueIds]),
    });
    const executionContextSetup = this.executionContext.setup();
    const docLinksSetup = this.docLinks.setup();

    const httpSetup = await this.http.setup({
      context: contextServiceSetup,
      executionContext: executionContextSetup,
    });

    const deprecationsSetup = await this.deprecations.setup({
      http: httpSetup,
    });

    // setup i18n prior to any other service, to have translations ready
    const i18nServiceSetup = await this.i18n.setup({ http: httpSetup, pluginPaths });

    const capabilitiesSetup = this.capabilities.setup({ http: httpSetup });

    const elasticsearchServiceSetup = await this.elasticsearch.setup({
      http: httpSetup,
      executionContext: executionContextSetup,
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
      deprecations: deprecationsSetup,
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
      coreUsageData: coreUsageDataSetup,
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

    const loggingSetup = this.logging.setup();

    const coreSetup: InternalCoreSetup = {
      analytics: analyticsSetup,
      capabilities: capabilitiesSetup,
      context: contextServiceSetup,
      docLinks: docLinksSetup,
      elasticsearch: elasticsearchServiceSetup,
      environment: environmentSetup,
      executionContext: executionContextSetup,
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
      coreUsageData: coreUsageDataSetup,
    };

    const pluginsSetup = await this.plugins.setup(coreSetup);
    this.#pluginsInitialized = pluginsSetup.initialized;

    this.registerCoreContext(coreSetup);
    this.coreApp.setup(coreSetup, uiPlugins);

    setupTransaction?.end();
    return coreSetup;
  }

  public async start() {
    this.log.debug('starting server');
    const startTransaction = apm.startTransaction('server-start', 'kibana-platform');

    const analyticsStart = this.analytics.start();
    const executionContextStart = this.executionContext.start();
    const docLinkStart = this.docLinks.start();
    const elasticsearchStart = await this.elasticsearch.start();
    const deprecationsStart = this.deprecations.start();
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

    this.status.start();

    this.coreStart = {
      analytics: analyticsStart,
      capabilities: capabilitiesStart,
      docLinks: docLinkStart,
      elasticsearch: elasticsearchStart,
      executionContext: executionContextStart,
      http: httpStart,
      metrics: metricsStart,
      savedObjects: savedObjectsStart,
      uiSettings: uiSettingsStart,
      coreUsageData: coreUsageDataStart,
      deprecations: deprecationsStart,
    };

    await this.plugins.start(this.coreStart);

    await this.http.start();

    startTransaction?.end();

    return this.coreStart;
  }

  public async stop() {
    this.log.debug('stopping server');

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
    coreSetup.http.registerRouteHandlerContext(coreId, 'core', async (context, req, res) => {
      return new CoreRouteHandlerContext(this.coreStart!, req);
    });
  }

  public setupCoreConfig() {
    const configDescriptors: Array<ServiceConfigDescriptor<unknown>> = [
      executionContextConfig,
      pathConfig,
      cspConfig,
      elasticsearchConfig,
      externalUrlConfig,
      loggingConfig,
      httpConfig,
      pluginsConfig,
      savedObjectsConfig,
      savedObjectsMigrationConfig,
      uiSettingsConfig,
      opsConfig,
      statusConfig,
      pidConfig,
      i18nConfig,
      deprecationConfig,
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
