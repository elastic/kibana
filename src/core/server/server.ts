/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import apm from 'elastic-apm-node';
import { config as pathConfig } from '@kbn/utils';
import type { Logger, LoggerFactory } from '@kbn/logging';
import { ConfigService, Env, RawConfigurationProvider } from '@kbn/config';
import type { ServiceConfigDescriptor } from '@kbn/core-base-server-internal';
import { DocLinksService } from '@kbn/core-doc-links-server-internal';
import {
  LoggingService,
  ILoggingSystem,
  config as loggingConfig,
} from '@kbn/core-logging-server-internal';
import {
  coreDeprecationProvider,
  ensureValidConfiguration,
} from '@kbn/core-config-server-internal';
import { NodeService, nodeConfig } from '@kbn/core-node-server-internal';
import { AnalyticsService } from '@kbn/core-analytics-server-internal';
import type { AnalyticsServiceSetup, AnalyticsServiceStart } from '@kbn/core-analytics-server';
import { reportPerformanceMetricEvent } from '@kbn/ebt-tools';
import { EnvironmentService, pidConfig } from '@kbn/core-environment-server-internal';
import {
  ExecutionContextService,
  executionContextConfig,
} from '@kbn/core-execution-context-server-internal';
import { PrebootService } from '@kbn/core-preboot-server-internal';
import { ContextService } from '@kbn/core-http-context-server-internal';
import {
  HttpService,
  config as httpConfig,
  cspConfig,
  externalUrlConfig,
} from '@kbn/core-http-server-internal';
import {
  ElasticsearchService,
  config as elasticsearchConfig,
} from '@kbn/core-elasticsearch-server-internal';
import { MetricsService, opsConfig } from '@kbn/core-metrics-server-internal';
import { CapabilitiesService } from '@kbn/core-capabilities-server-internal';
import type { SavedObjectsServiceStart } from '@kbn/core-saved-objects-server';
import {
  savedObjectsConfig,
  savedObjectsMigrationConfig,
} from '@kbn/core-saved-objects-base-server-internal';
import { SavedObjectsService } from '@kbn/core-saved-objects-server-internal';
import { I18nService, config as i18nConfig } from '@kbn/core-i18n-server-internal';
import {
  DeprecationsService,
  config as deprecationConfig,
} from '@kbn/core-deprecations-server-internal';
import { CoreUsageDataService } from '@kbn/core-usage-data-server-internal';
import { StatusService, statusConfig } from '@kbn/core-status-server-internal';
import { UiSettingsService, uiSettingsConfig } from '@kbn/core-ui-settings-server-internal';

import { CoreApp } from './core_app';
import { HttpResourcesService } from './http_resources';
import { RenderingService } from './rendering';
import { PluginsService, config as pluginsConfig } from './plugins';
import { InternalCorePreboot, InternalCoreSetup, InternalCoreStart } from './internal_types';
import { CoreRouteHandlerContext } from './core_route_handler_context';
import { PrebootCoreRouteHandlerContext } from './preboot_core_route_handler_context';
import { DiscoveredPlugins } from './plugins';
import type { RequestHandlerContext, PrebootRequestHandlerContext } from '.';

const coreId = Symbol('core');
const rootConfigPath = '';
const KIBANA_STARTED_EVENT = 'kibana_started';

/** @internal */
interface UptimePerStep {
  start: number;
  end: number;
}

/** @internal */
interface UptimeSteps {
  constructor: UptimePerStep;
  preboot: UptimePerStep;
  setup: UptimePerStep;
  start: UptimePerStep;
}

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
  private readonly node: NodeService;
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

  private readonly uptimePerStep: Partial<UptimeSteps> = {};

  constructor(
    rawConfigProvider: RawConfigurationProvider,
    public readonly env: Env,
    private readonly loggingSystem: ILoggingSystem
  ) {
    const constructorStartUptime = process.uptime();

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
    this.node = new NodeService(core);
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

    this.uptimePerStep.constructor = { start: constructorStartUptime, end: process.uptime() };
  }

  public async preboot() {
    this.log.debug('prebooting server');
    const prebootStartUptime = process.uptime();
    const prebootTransaction = apm.startTransaction('server-preboot', 'kibana-platform');

    const analyticsPreboot = this.analytics.preboot();

    const environmentPreboot = await this.environment.preboot({ analytics: analyticsPreboot });
    const nodePreboot = await this.node.preboot({ loggingSystem: this.loggingSystem });

    // Discover any plugins before continuing. This allows other systems to utilize the plugin dependency graph.
    this.discoveredPlugins = await this.plugins.discover({
      environment: environmentPreboot,
      node: nodePreboot,
    });

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

    httpPreboot.registerRouteHandlerContext<PrebootRequestHandlerContext, 'core'>(
      coreId,
      'core',
      () => {
        return new PrebootCoreRouteHandlerContext(corePreboot);
      }
    );

    this.coreApp.preboot(corePreboot, uiPlugins);

    prebootTransaction?.end();
    this.uptimePerStep.preboot = { start: prebootStartUptime, end: process.uptime() };
    return corePreboot;
  }

  public async setup() {
    this.log.debug('setting up server');
    const setupStartUptime = process.uptime();
    const setupTransaction = apm.startTransaction('server-setup', 'kibana-platform');

    const analyticsSetup = this.analytics.setup();

    this.registerKibanaStartedEventType(analyticsSetup);

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
      analytics: analyticsSetup,
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
      analytics: analyticsSetup,
      elasticsearch: elasticsearchServiceSetup,
      pluginDependencies: pluginTree.asNames,
      savedObjects: savedObjectsSetup,
      environment: environmentSetup,
      http: httpSetup,
      metrics: metricsSetup,
      coreUsageData: coreUsageDataSetup,
    });

    const renderingSetup = await this.rendering.setup({
      elasticsearch: elasticsearchServiceSetup,
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
    this.uptimePerStep.setup = { start: setupStartUptime, end: process.uptime() };
    return coreSetup;
  }

  public async start() {
    this.log.debug('starting server');
    const startStartUptime = process.uptime();
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
      docLinks: docLinkStart,
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

    this.uptimePerStep.start = { start: startStartUptime, end: process.uptime() };
    this.reportKibanaStartedEvents(analyticsStart);

    return this.coreStart;
  }

  public async stop() {
    this.log.debug('stopping server');

    this.analytics.stop();
    await this.http.stop(); // HTTP server has to stop before savedObjects and ES clients are closed to be able to gracefully attempt to resolve any pending requests
    await this.plugins.stop();
    await this.savedObjects.stop();
    await this.elasticsearch.stop();
    await this.uiSettings.stop();
    await this.rendering.stop();
    await this.metrics.stop();
    await this.status.stop();
    await this.logging.stop();
    this.node.stop();
    this.deprecations.stop();
  }

  private registerCoreContext(coreSetup: InternalCoreSetup) {
    coreSetup.http.registerRouteHandlerContext<RequestHandlerContext, 'core'>(
      coreId,
      'core',
      (context, req) => {
        return new CoreRouteHandlerContext(this.coreStart!, req);
      }
    );
  }

  public setupCoreConfig() {
    const configDescriptors: Array<ServiceConfigDescriptor<unknown>> = [
      cspConfig,
      deprecationConfig,
      elasticsearchConfig,
      executionContextConfig,
      externalUrlConfig,
      httpConfig,
      i18nConfig,
      loggingConfig,
      nodeConfig,
      opsConfig,
      pathConfig,
      pidConfig,
      pluginsConfig,
      savedObjectsConfig,
      savedObjectsMigrationConfig,
      statusConfig,
      uiSettingsConfig,
    ];

    this.configService.addDeprecationProvider(rootConfigPath, coreDeprecationProvider);
    for (const descriptor of configDescriptors) {
      if (descriptor.deprecations) {
        this.configService.addDeprecationProvider(descriptor.path, descriptor.deprecations);
      }
      this.configService.setSchema(descriptor.path, descriptor.schema);
    }
  }

  /**
   * Register the legacy KIBANA_STARTED_EVENT.
   * @param analyticsSetup The {@link AnalyticsServiceSetup}
   * @private
   */
  private registerKibanaStartedEventType(analyticsSetup: AnalyticsServiceSetup) {
    analyticsSetup.registerEventType<{ uptime_per_step: UptimeSteps }>({
      eventType: KIBANA_STARTED_EVENT,
      schema: {
        uptime_per_step: {
          properties: {
            constructor: {
              properties: {
                start: {
                  type: 'float',
                  _meta: {
                    description:
                      'Number of seconds the Node.js process has been running until the constructor was called',
                  },
                },
                end: {
                  type: 'float',
                  _meta: {
                    description:
                      'Number of seconds the Node.js process has been running until the constructor finished',
                  },
                },
              },
            },
            preboot: {
              properties: {
                start: {
                  type: 'float',
                  _meta: {
                    description:
                      'Number of seconds the Node.js process has been running until `preboot` was called',
                  },
                },
                end: {
                  type: 'float',
                  _meta: {
                    description:
                      'Number of seconds the Node.js process has been running until `preboot` finished',
                  },
                },
              },
            },
            setup: {
              properties: {
                start: {
                  type: 'float',
                  _meta: {
                    description:
                      'Number of seconds the Node.js process has been running until `setup` was called',
                  },
                },
                end: {
                  type: 'float',
                  _meta: {
                    description:
                      'Number of seconds the Node.js process has been running until `setup` finished',
                  },
                },
              },
            },
            start: {
              properties: {
                start: {
                  type: 'float',
                  _meta: {
                    description:
                      'Number of seconds the Node.js process has been running until `start` was called',
                  },
                },
                end: {
                  type: 'float',
                  _meta: {
                    description:
                      'Number of seconds the Node.js process has been running until `start` finished',
                  },
                },
              },
            },
          },
          _meta: {
            description:
              'Number of seconds the Node.js process has been running until each phase of the server execution is called and finished.',
          },
        },
      },
    });
  }

  /**
   * Reports the new and legacy KIBANA_STARTED_EVENT.
   * @param analyticsStart The {@link AnalyticsServiceStart}.
   * @private
   */
  private reportKibanaStartedEvents(analyticsStart: AnalyticsServiceStart) {
    // Report the legacy KIBANA_STARTED_EVENT.
    analyticsStart.reportEvent(KIBANA_STARTED_EVENT, { uptime_per_step: this.uptimePerStep });

    const ups = this.uptimePerStep;

    const toMs = (sec: number) => Math.round(sec * 1000);
    // Report the metric-shaped KIBANA_STARTED_EVENT.
    reportPerformanceMetricEvent(analyticsStart, {
      eventName: KIBANA_STARTED_EVENT,
      duration: toMs(ups.start!.end - ups.constructor!.start),
      key1: 'time_to_constructor',
      value1: toMs(ups.constructor!.start),
      key2: 'constructor_time',
      value2: toMs(ups.constructor!.end - ups.constructor!.start),
      key3: 'preboot_time',
      value3: toMs(ups.preboot!.end - ups.preboot!.start),
      key4: 'setup_time',
      value4: toMs(ups.setup!.end - ups.setup!.start),
      key5: 'start_time',
      value5: toMs(ups.start!.end - ups.start!.start),
    });
  }
}
