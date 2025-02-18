/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import apm from 'elastic-apm-node';
import { firstValueFrom } from 'rxjs';
import type { Logger, LoggerFactory } from '@kbn/logging';
import type { NodeRoles } from '@kbn/core-node-server';
import { CriticalError } from '@kbn/core-base-server-internal';
import { ConfigService, Env, RawConfigurationProvider } from '@kbn/config';
import { DocLinksService } from '@kbn/core-doc-links-server-internal';
import { LoggingService, ILoggingSystem } from '@kbn/core-logging-server-internal';
import { ensureValidConfiguration } from '@kbn/core-config-server-internal';
import { NodeService } from '@kbn/core-node-server-internal';
import { AnalyticsService } from '@kbn/core-analytics-server-internal';
import { EnvironmentService } from '@kbn/core-environment-server-internal';
import { ExecutionContextService } from '@kbn/core-execution-context-server-internal';
import { FeatureFlagsService } from '@kbn/core-feature-flags-server-internal';
import { PrebootService } from '@kbn/core-preboot-server-internal';
import { ContextService } from '@kbn/core-http-context-server-internal';
import { HttpService } from '@kbn/core-http-server-internal';
import { ElasticsearchService } from '@kbn/core-elasticsearch-server-internal';
import { MetricsService } from '@kbn/core-metrics-server-internal';
import { CapabilitiesService } from '@kbn/core-capabilities-server-internal';
import type { SavedObjectsServiceStart } from '@kbn/core-saved-objects-server';
import { SavedObjectsService } from '@kbn/core-saved-objects-server-internal';
import { I18nService } from '@kbn/core-i18n-server-internal';
import { DeprecationsService } from '@kbn/core-deprecations-server-internal';
import { CoreUsageDataService } from '@kbn/core-usage-data-server-internal';
import { StatusService } from '@kbn/core-status-server-internal';
import { UiSettingsService } from '@kbn/core-ui-settings-server-internal';
import { CustomBrandingService } from '@kbn/core-custom-branding-server-internal';
import { UserSettingsService } from '@kbn/core-user-settings-server-internal';
import {
  CoreRouteHandlerContext,
  PrebootCoreRouteHandlerContext,
} from '@kbn/core-http-request-handler-context-server-internal';
import type {
  RequestHandlerContext,
  PrebootRequestHandlerContext,
} from '@kbn/core-http-request-handler-context-server';
import { RenderingService } from '@kbn/core-rendering-server-internal';
import { HttpRateLimiterService } from '@kbn/core-http-rate-limiter-internal';
import { HttpResourcesService } from '@kbn/core-http-resources-server-internal';
import type {
  InternalCorePreboot,
  InternalCoreSetup,
  InternalCoreStart,
} from '@kbn/core-lifecycle-server-internal';
import { DiscoveredPlugins, PluginsService } from '@kbn/core-plugins-server-internal';
import { CoreAppsService } from '@kbn/core-apps-server-internal';
import { SecurityService } from '@kbn/core-security-server-internal';
import { UserProfileService } from '@kbn/core-user-profile-server-internal';
import { registerServiceConfig } from './register_service_config';
import { MIGRATION_EXCEPTION_CODE } from './constants';
import { coreConfig, type CoreConfigType } from './core_config';
import { registerRootEvents, reportKibanaStartedEvent, type UptimeSteps } from './events';

const coreId = Symbol('core');

/** @internal */

export class Server {
  public readonly configService: ConfigService;
  private readonly analytics: AnalyticsService;
  private readonly capabilities: CapabilitiesService;
  private readonly context: ContextService;
  private readonly elasticsearch: ElasticsearchService;
  private readonly featureFlags: FeatureFlagsService;
  private readonly http: HttpService;
  private readonly rendering: RenderingService;
  private readonly log: Logger;
  private readonly plugins: PluginsService;
  private readonly savedObjects: SavedObjectsService;
  private readonly uiSettings: UiSettingsService;
  private readonly environment: EnvironmentService;
  private readonly node: NodeService;
  private readonly metrics: MetricsService;
  private readonly httpRateLimiter: HttpRateLimiterService;
  private readonly httpResources: HttpResourcesService;
  private readonly status: StatusService;
  private readonly logging: LoggingService;
  private readonly coreApp: CoreAppsService;
  private readonly coreUsageData: CoreUsageDataService;
  private readonly i18n: I18nService;
  private readonly deprecations: DeprecationsService;
  private readonly executionContext: ExecutionContextService;
  private readonly prebootService: PrebootService;
  private readonly docLinks: DocLinksService;
  private readonly customBranding: CustomBrandingService;
  private readonly userSettingsService: UserSettingsService;
  private readonly security: SecurityService;
  private readonly userProfile: UserProfileService;

  private readonly savedObjectsStartPromise: Promise<SavedObjectsServiceStart>;
  private resolveSavedObjectsStartPromise?: (value: SavedObjectsServiceStart) => void;

  #pluginsInitialized?: boolean;
  private coreStart?: InternalCoreStart;
  private discoveredPlugins?: DiscoveredPlugins;
  private readonly logger: LoggerFactory;
  private nodeRoles?: NodeRoles;

  private readonly uptimePerStep: Partial<UptimeSteps> = {};

  constructor(
    rawConfigProvider: RawConfigurationProvider,
    public readonly env: Env,
    private readonly loggingSystem: ILoggingSystem
  ) {
    const constructorStartUptime = performance.now();

    this.logger = this.loggingSystem.asLoggerFactory();
    this.log = this.logger.get('server');
    this.configService = new ConfigService(rawConfigProvider, env, this.logger);

    const core = { coreId, configService: this.configService, env, logger: this.logger };
    this.analytics = new AnalyticsService(core);
    this.context = new ContextService(core);
    this.featureFlags = new FeatureFlagsService(core);
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
    this.coreApp = new CoreAppsService(core);
    this.httpRateLimiter = new HttpRateLimiterService();
    this.httpResources = new HttpResourcesService(core);
    this.logging = new LoggingService(core);
    this.coreUsageData = new CoreUsageDataService(core);
    this.i18n = new I18nService(core);
    this.deprecations = new DeprecationsService(core);
    this.executionContext = new ExecutionContextService(core);
    this.prebootService = new PrebootService(core);
    this.docLinks = new DocLinksService(core);
    this.customBranding = new CustomBrandingService(core);
    this.userSettingsService = new UserSettingsService(core);
    this.security = new SecurityService(core);
    this.userProfile = new UserProfileService(core);

    this.savedObjectsStartPromise = new Promise((resolve) => {
      this.resolveSavedObjectsStartPromise = resolve;
    });

    this.uptimePerStep.constructor = { start: constructorStartUptime, end: performance.now() };
  }

  public async preboot(): Promise<InternalCorePreboot | undefined> {
    this.log.debug('prebooting server');

    const config = await firstValueFrom(this.configService.atPath<CoreConfigType>(coreConfig.path));
    const { disablePreboot } = config.lifecycle;
    if (disablePreboot) {
      this.log.info('preboot phase is disabled - skipping');
    }

    const prebootStartUptime = performance.now();
    const prebootTransaction = apm.startTransaction('server-preboot', 'kibana-platform');

    // service required for plugin discovery
    const analyticsPreboot = this.analytics.preboot();
    const environmentPreboot = await this.environment.preboot({ analytics: analyticsPreboot });
    const nodePreboot = await this.node.preboot({ loggingSystem: this.loggingSystem });
    this.nodeRoles = nodePreboot.roles;

    // Discover any plugins before continuing. This allows other systems to utilize the plugin dependency graph.
    this.discoveredPlugins = await this.plugins.discover({
      environment: environmentPreboot,
      node: nodePreboot,
    });

    if (!disablePreboot) {
      // Immediately terminate in case of invalid configuration. This needs to be done after plugin discovery. We also
      // silent deprecation warnings until `setup` stage where we'll validate config once again.
      await ensureValidConfiguration(this.configService, { logDeprecations: false });
    }

    // services we need to preboot even when preboot is disabled
    const uiSettingsPreboot = await this.uiSettings.preboot();
    const loggingPreboot = this.logging.preboot({ loggingSystem: this.loggingSystem });

    let corePreboot: InternalCorePreboot | undefined;

    if (!disablePreboot) {
      const { uiPlugins, pluginTree, pluginPaths } = this.discoveredPlugins.preboot;

      const contextServicePreboot = this.context.preboot({
        pluginDependencies: new Map([...pluginTree.asOpaqueIds]),
      });

      const httpPreboot = await this.http.preboot({ context: contextServicePreboot });

      // setup i18n prior to any other service, to have translations ready
      const i18nPreboot = await this.i18n.preboot({ http: httpPreboot, pluginPaths });

      this.capabilities.preboot({ http: httpPreboot });

      const elasticsearchServicePreboot = await this.elasticsearch.preboot();

      await this.status.preboot({ http: httpPreboot });

      const renderingPreboot = await this.rendering.preboot({
        http: httpPreboot,
        uiPlugins,
        i18n: i18nPreboot,
      });

      const httpResourcesPreboot = this.httpResources.preboot({
        http: httpPreboot,
        rendering: renderingPreboot,
      });

      corePreboot = {
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
          return new PrebootCoreRouteHandlerContext(corePreboot!);
        }
      );

      this.coreApp.preboot(corePreboot, uiPlugins);
    }

    prebootTransaction.end();
    this.uptimePerStep.preboot = { start: prebootStartUptime, end: performance.now() };

    return corePreboot;
  }

  public async setup() {
    this.log.debug('setting up server');
    const setupStartUptime = performance.now();
    const setupTransaction = apm.startTransaction('server-setup', 'kibana-platform');

    const analyticsSetup = this.analytics.setup();

    registerRootEvents(analyticsSetup);

    const environmentSetup = this.environment.setup();

    // Configuration could have changed after preboot.
    await this.ensureValidConfiguration();

    const { uiPlugins, pluginPaths, pluginTree } = this.discoveredPlugins!.standard;
    const contextServiceSetup = this.context.setup({
      pluginDependencies: new Map([...pluginTree.asOpaqueIds]),
    });
    const executionContextSetup = this.executionContext.setup();
    const docLinksSetup = this.docLinks.setup();
    const securitySetup = this.security.setup();
    const userProfileSetup = this.userProfile.setup();

    const httpSetup = await this.http.setup({
      context: contextServiceSetup,
      executionContext: executionContextSetup,
    });

    // setup i18n prior to any other service, to have translations ready
    const i18nServiceSetup = await this.i18n.setup({ http: httpSetup, pluginPaths });

    const capabilitiesSetup = this.capabilities.setup({ http: httpSetup });

    const elasticsearchServiceSetup = await this.elasticsearch.setup({
      analytics: analyticsSetup,
      http: httpSetup,
      executionContext: executionContextSetup,
    });

    const metricsSetup = await this.metrics.setup({
      http: httpSetup,
      elasticsearchService: elasticsearchServiceSetup,
    });

    const coreUsageDataSetup = this.coreUsageData.setup({
      http: httpSetup,
      metrics: metricsSetup,
      savedObjectsStartPromise: this.savedObjectsStartPromise,
      changedDeprecatedConfigPath$: this.configService.getDeprecatedConfigPath$(),
    });

    const loggingSetup = this.logging.setup();

    const deprecationsSetup = await this.deprecations.setup({
      http: httpSetup,
      coreUsageData: coreUsageDataSetup,
      logging: loggingSetup,
      docLinks: docLinksSetup,
    });

    const savedObjectsSetup = await this.savedObjects.setup({
      http: httpSetup,
      elasticsearch: elasticsearchServiceSetup,
      deprecations: deprecationsSetup,
      coreUsageData: coreUsageDataSetup,
      docLinks: docLinksSetup,
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

    const customBrandingSetup = this.customBranding.setup();
    const userSettingsServiceSetup = this.userSettingsService.setup();
    const featureFlagsSetup = this.featureFlags.setup();

    const renderingSetup = await this.rendering.setup({
      elasticsearch: elasticsearchServiceSetup,
      featureFlags: featureFlagsSetup,
      http: httpSetup,
      status: statusSetup,
      uiPlugins,
      customBranding: customBrandingSetup,
      userSettings: userSettingsServiceSetup,
      i18n: i18nServiceSetup,
    });

    this.httpRateLimiter.setup({
      http: httpSetup,
      metrics: metricsSetup,
    });
    const httpResourcesSetup = this.httpResources.setup({
      http: httpSetup,
      rendering: renderingSetup,
    });

    const coreSetup: InternalCoreSetup = {
      analytics: analyticsSetup,
      capabilities: capabilitiesSetup,
      context: contextServiceSetup,
      customBranding: customBrandingSetup,
      docLinks: docLinksSetup,
      elasticsearch: elasticsearchServiceSetup,
      environment: environmentSetup,
      executionContext: executionContextSetup,
      featureFlags: featureFlagsSetup,
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
      userSettings: userSettingsServiceSetup,
      security: securitySetup,
      userProfile: userProfileSetup,
    };

    const pluginsSetup = await this.plugins.setup(coreSetup);
    this.#pluginsInitialized = pluginsSetup.initialized;

    this.registerCoreContext(coreSetup);
    await this.coreApp.setup(coreSetup, uiPlugins);

    setupTransaction.end();
    this.uptimePerStep.setup = { start: setupStartUptime, end: performance.now() };
    return coreSetup;
  }

  public async start() {
    this.log.debug('starting server');
    const startStartUptime = performance.now();
    const startTransaction = apm.startTransaction('server-start', 'kibana-platform');

    const analyticsStart = this.analytics.start();
    const securityStart = this.security.start();
    const userProfileStart = this.userProfile.start();
    this.userSettingsService.start({ userProfile: userProfileStart });
    const executionContextStart = this.executionContext.start();
    const docLinkStart = this.docLinks.start();

    const elasticsearchStart = await this.elasticsearch.start();
    this.uptimePerStep.elasticsearch = {
      waitTime: elasticsearchStart.metrics.elasticsearchWaitTime,
    };

    const deprecationsStart = this.deprecations.start();
    const soStartSpan = startTransaction.startSpan('saved_objects.migration', 'migration');
    const savedObjectsStart = await this.savedObjects.start({
      elasticsearch: elasticsearchStart,
      pluginsInitialized: this.#pluginsInitialized,
      docLinks: docLinkStart,
      node: await this.node.start(),
    });
    this.uptimePerStep.savedObjects = {
      migrationTime: savedObjectsStart.metrics.migrationDuration,
    };
    await this.resolveSavedObjectsStartPromise!(savedObjectsStart);

    soStartSpan?.end();

    if (this.nodeRoles?.migrator === true) {
      startTransaction.end();
      this.log.info('Detected migrator node role; shutting down Kibana...');
      throw new CriticalError(
        'Migrations completed, shutting down Kibana',
        MIGRATION_EXCEPTION_CODE,
        0
      );
    }

    const capabilitiesStart = this.capabilities.start();
    const uiSettingsStart = await this.uiSettings.start();
    const customBrandingStart = this.customBranding.start();
    const metricsStart = await this.metrics.start();
    const httpStart = this.http.getStartContract();
    const coreUsageDataStart = this.coreUsageData.start({
      elasticsearch: elasticsearchStart,
      savedObjects: savedObjectsStart,
      exposedConfigsToUsage: this.plugins.getExposedPluginConfigsToUsage(),
    });

    const featureFlagsStart = this.featureFlags.start();

    this.httpRateLimiter.start();
    this.status.start();

    this.rendering.start({
      featureFlags: featureFlagsStart,
    });

    this.coreStart = {
      analytics: analyticsStart,
      capabilities: capabilitiesStart,
      customBranding: customBrandingStart,
      docLinks: docLinkStart,
      elasticsearch: elasticsearchStart,
      executionContext: executionContextStart,
      featureFlags: featureFlagsStart,
      http: httpStart,
      metrics: metricsStart,
      savedObjects: savedObjectsStart,
      uiSettings: uiSettingsStart,
      coreUsageData: coreUsageDataStart,
      deprecations: deprecationsStart,
      security: securityStart,
      userProfile: userProfileStart,
    };

    this.coreApp.start(this.coreStart);

    await this.plugins.start(this.coreStart);

    await this.http.start();

    startTransaction.end();

    this.uptimePerStep.start = { start: startStartUptime, end: performance.now() };

    reportKibanaStartedEvent({
      uptimeSteps: this.uptimePerStep as UptimeSteps,
      analytics: analyticsStart,
    });

    return this.coreStart;
  }

  public async stop() {
    this.log.debug('stopping server');

    this.coreApp.stop();
    this.httpRateLimiter.stop();
    await this.analytics.stop();
    await this.http.stop(); // HTTP server has to stop before savedObjects and ES clients are closed to be able to gracefully attempt to resolve any pending requests
    await this.plugins.stop();
    await this.savedObjects.stop();
    await this.elasticsearch.stop();
    await this.uiSettings.stop();
    await this.rendering.stop();
    await this.metrics.stop();
    await this.status.stop();
    await this.logging.stop();
    await this.customBranding.stop();
    await this.featureFlags.stop();
    this.node.stop();
    this.deprecations.stop();
    this.security.stop();
    this.userProfile.stop();
  }

  private async ensureValidConfiguration() {
    try {
      await ensureValidConfiguration(this.configService);
    } catch (validationError) {
      if (this.env.packageInfo.buildFlavor !== 'serverless') {
        throw validationError;
      }
      // When running on serverless, we may allow unknown keys, but stripping them from the final config object.
      this.configService.setGlobalStripUnknownKeys(true);
      await ensureValidConfiguration(this.configService, {
        logDeprecations: true,
        stripUnknownKeys: true,
      });
      this.log
        .get('config-validation')
        .error(
          `Strict config validation failed! Extra unknown keys removed in Serverless-compatible mode. Original error: ${validationError}`
        );
    }
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
    registerServiceConfig(this.configService);
  }
}
