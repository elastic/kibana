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

import { Type } from '@kbn/config-schema';

import {
  ConfigService,
  Env,
  ConfigPath,
  RawConfigurationProvider,
  coreDeprecationProvider,
} from './config';
import { CoreApp } from './core_app';
import { AuditTrailService } from './audit_trail';
import { ElasticsearchService } from './elasticsearch';
import { HttpService } from './http';
import { HttpResourcesService } from './http_resources';
import { RenderingService } from './rendering';
import { LegacyService, ensureValidConfiguration } from './legacy';
import { Logger, LoggerFactory, LoggingService, ILoggingSystem } from './logging';
import { UiSettingsService } from './ui_settings';
import { PluginsService, config as pluginsConfig } from './plugins';
import { SavedObjectsService } from '../server/saved_objects';
import { MetricsService, opsConfig } from './metrics';
import { CapabilitiesService } from './capabilities';
import { UuidService } from './uuid';
import { StatusService } from './status/status_service';

import { config as cspConfig } from './csp';
import { config as elasticsearchConfig } from './elasticsearch';
import { config as httpConfig } from './http';
import { config as loggingConfig } from './logging';
import { config as devConfig } from './dev';
import { config as pathConfig } from './path';
import { config as kibanaConfig } from './kibana_config';
import { savedObjectsConfig, savedObjectsMigrationConfig } from './saved_objects';
import { config as uiSettingsConfig } from './ui_settings';
import { mapToObject } from '../utils';
import { ContextService } from './context';
import { RequestHandlerContext } from '.';
import { InternalCoreSetup, InternalCoreStart } from './internal_types';

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
  private readonly uuid: UuidService;
  private readonly metrics: MetricsService;
  private readonly httpResources: HttpResourcesService;
  private readonly status: StatusService;
  private readonly logging: LoggingService;
  private readonly coreApp: CoreApp;
  private readonly auditTrail: AuditTrailService;

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
    this.uuid = new UuidService(core);
    this.metrics = new MetricsService(core);
    this.status = new StatusService(core);
    this.coreApp = new CoreApp(core);
    this.httpResources = new HttpResourcesService(core);
    this.auditTrail = new AuditTrailService(core);
    this.logging = new LoggingService(core);
  }

  public async setup() {
    this.log.debug('setting up server');

    // Discover any plugins before continuing. This allows other systems to utilize the plugin dependency graph.
    const { pluginTree, uiPlugins } = await this.plugins.discover();
    const legacyPlugins = await this.legacy.discoverPlugins();

    // Immediately terminate in case of invalid configuration
    await this.configService.validate();
    await ensureValidConfiguration(this.configService, legacyPlugins);

    const contextServiceSetup = this.context.setup({
      // We inject a fake "legacy plugin" with dependencies on every plugin so that legacy plugins:
      // 1) Can access context from any NP plugin
      // 2) Can register context providers that will only be available to other legacy plugins and will not leak into
      //    New Platform plugins.
      pluginDependencies: new Map([...pluginTree, [this.legacy.legacyId, [...pluginTree.keys()]]]),
    });

    const auditTrailSetup = this.auditTrail.setup();
    const uuidSetup = await this.uuid.setup();

    const httpSetup = await this.http.setup({
      context: contextServiceSetup,
    });

    const capabilitiesSetup = this.capabilities.setup({ http: httpSetup });

    const elasticsearchServiceSetup = await this.elasticsearch.setup({
      http: httpSetup,
    });

    const savedObjectsSetup = await this.savedObjects.setup({
      http: httpSetup,
      elasticsearch: elasticsearchServiceSetup,
      legacyPlugins,
    });

    const uiSettingsSetup = await this.uiSettings.setup({
      http: httpSetup,
      savedObjects: savedObjectsSetup,
    });

    await this.metrics.setup({ http: httpSetup });

    const renderingSetup = await this.rendering.setup({
      http: httpSetup,
      legacyPlugins,
      uiPlugins,
    });

    const httpResourcesSetup = this.httpResources.setup({
      http: httpSetup,
      rendering: renderingSetup,
    });

    const statusSetup = this.status.setup({
      elasticsearch: elasticsearchServiceSetup,
      savedObjects: savedObjectsSetup,
    });

    const loggingSetup = this.logging.setup({
      loggingSystem: this.loggingSystem,
    });

    const coreSetup: InternalCoreSetup = {
      capabilities: capabilitiesSetup,
      context: contextServiceSetup,
      elasticsearch: elasticsearchServiceSetup,
      http: httpSetup,
      savedObjects: savedObjectsSetup,
      status: statusSetup,
      uiSettings: uiSettingsSetup,
      uuid: uuidSetup,
      rendering: renderingSetup,
      httpResources: httpResourcesSetup,
      auditTrail: auditTrailSetup,
      logging: loggingSetup,
    };

    const pluginsSetup = await this.plugins.setup(coreSetup);
    this.#pluginsInitialized = pluginsSetup.initialized;

    await this.legacy.setup({
      core: { ...coreSetup, plugins: pluginsSetup, rendering: renderingSetup },
      plugins: mapToObject(pluginsSetup.contracts),
      uiPlugins,
    });

    this.registerCoreContext(coreSetup);
    this.coreApp.setup(coreSetup);

    return coreSetup;
  }

  public async start() {
    this.log.debug('starting server');
    const auditTrailStart = this.auditTrail.start();

    const elasticsearchStart = await this.elasticsearch.start({
      auditTrail: auditTrailStart,
    });
    const savedObjectsStart = await this.savedObjects.start({
      elasticsearch: elasticsearchStart,
      pluginsInitialized: this.#pluginsInitialized,
    });
    const capabilitiesStart = this.capabilities.start();
    const uiSettingsStart = await this.uiSettings.start();
    const metricsStart = await this.metrics.start();
    const httpStart = this.http.getStartContract();

    this.coreStart = {
      capabilities: capabilitiesStart,
      elasticsearch: elasticsearchStart,
      http: httpStart,
      metrics: metricsStart,
      savedObjects: savedObjectsStart,
      uiSettings: uiSettingsStart,
      auditTrail: auditTrailStart,
    };

    const pluginsStart = await this.plugins.start(this.coreStart);

    await this.legacy.start({
      core: {
        ...this.coreStart,
        plugins: pluginsStart,
      },
      plugins: mapToObject(pluginsStart.contracts),
    });

    await this.http.start();

    await this.rendering.start({
      legacy: this.legacy,
    });

    return this.coreStart;
  }

  public async stop() {
    this.log.debug('stopping server');

    await this.legacy.stop();
    await this.plugins.stop();
    await this.savedObjects.stop();
    await this.elasticsearch.stop();
    await this.http.stop();
    await this.uiSettings.stop();
    await this.rendering.stop();
    await this.metrics.stop();
    await this.status.stop();
    await this.logging.stop();
    await this.auditTrail.stop();
  }

  private registerCoreContext(coreSetup: InternalCoreSetup) {
    coreSetup.http.registerRouteHandlerContext(
      coreId,
      'core',
      async (context, req, res): Promise<RequestHandlerContext['core']> => {
        const coreStart = this.coreStart!;
        const savedObjectsClient = coreStart.savedObjects.getScopedClient(req);

        return {
          savedObjects: {
            client: savedObjectsClient,
            typeRegistry: coreStart.savedObjects.getTypeRegistry(),
          },
          elasticsearch: {
            legacy: {
              client: coreStart.elasticsearch.legacy.client.asScoped(req),
            },
          },
          uiSettings: {
            client: coreStart.uiSettings.asScopedToClient(savedObjectsClient),
          },
          auditor: coreStart.auditTrail.asScoped(req),
        };
      }
    );
  }

  public async setupCoreConfig() {
    const schemas: Array<[ConfigPath, Type<unknown>]> = [
      [pathConfig.path, pathConfig.schema],
      [cspConfig.path, cspConfig.schema],
      [elasticsearchConfig.path, elasticsearchConfig.schema],
      [loggingConfig.path, loggingConfig.schema],
      [httpConfig.path, httpConfig.schema],
      [pluginsConfig.path, pluginsConfig.schema],
      [devConfig.path, devConfig.schema],
      [kibanaConfig.path, kibanaConfig.schema],
      [savedObjectsConfig.path, savedObjectsConfig.schema],
      [savedObjectsMigrationConfig.path, savedObjectsMigrationConfig.schema],
      [uiSettingsConfig.path, uiSettingsConfig.schema],
      [opsConfig.path, opsConfig.schema],
    ];

    this.configService.addDeprecationProvider(rootConfigPath, coreDeprecationProvider);
    this.configService.addDeprecationProvider(
      elasticsearchConfig.path,
      elasticsearchConfig.deprecations!
    );
    this.configService.addDeprecationProvider(
      uiSettingsConfig.path,
      uiSettingsConfig.deprecations!
    );

    for (const [path, schema] of schemas) {
      await this.configService.setSchema(path, schema);
    }
  }
}
