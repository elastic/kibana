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
import { ElasticsearchService } from './elasticsearch';
import { HttpService, InternalHttpServiceSetup } from './http';
import { RenderingService, RenderingServiceSetup } from './rendering';
import { LegacyService, ensureValidConfiguration } from './legacy';
import { Logger, LoggerFactory } from './logging';
import { UiSettingsService } from './ui_settings';
import { PluginsService, config as pluginsConfig } from './plugins';
import { SavedObjectsService } from '../server/saved_objects';

import { config as cspConfig } from './csp';
import { config as elasticsearchConfig } from './elasticsearch';
import { config as httpConfig } from './http';
import { config as loggingConfig } from './logging';
import { config as devConfig } from './dev';
import { config as pathConfig } from './path';
import { config as kibanaConfig } from './kibana_config';
import { config as savedObjectsConfig } from './saved_objects';
import { config as uiSettingsConfig } from './ui_settings';
import { mapToObject } from '../utils';
import { ContextService } from './context';
import { RequestHandlerContext } from '.';
import { InternalCoreSetup } from './internal_types';
import { CapabilitiesService } from './capabilities';
import { UuidService } from './uuid';

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

  constructor(
    rawConfigProvider: RawConfigurationProvider,
    public readonly env: Env,
    private readonly logger: LoggerFactory
  ) {
    this.log = this.logger.get('server');
    this.configService = new ConfigService(rawConfigProvider, env, logger);

    const core = { coreId, configService: this.configService, env, logger };
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
  }

  public async setup() {
    this.log.debug('setting up server');

    // Discover any plugins before continuing. This allows other systems to utilize the plugin dependency graph.
    const pluginDependencies = await this.plugins.discover();
    const legacyPlugins = await this.legacy.discoverPlugins();

    // Immediately terminate in case of invalid configuration
    await this.configService.validate();
    await ensureValidConfiguration(this.configService, legacyPlugins);

    const contextServiceSetup = this.context.setup({
      // We inject a fake "legacy plugin" with dependencies on every plugin so that legacy plugins:
      // 1) Can access context from any NP plugin
      // 2) Can register context providers that will only be available to other legacy plugins and will not leak into
      //    New Platform plugins.
      pluginDependencies: new Map([
        ...pluginDependencies,
        [this.legacy.legacyId, [...pluginDependencies.keys()]],
      ]),
    });

    const uuidSetup = await this.uuid.setup();

    const httpSetup = await this.http.setup({
      context: contextServiceSetup,
    });

    this.registerDefaultRoute(httpSetup);

    const capabilitiesSetup = this.capabilities.setup({ http: httpSetup });

    const elasticsearchServiceSetup = await this.elasticsearch.setup({
      http: httpSetup,
    });

    const uiSettingsSetup = await this.uiSettings.setup({
      http: httpSetup,
    });

    const savedObjectsSetup = await this.savedObjects.setup({
      elasticsearch: elasticsearchServiceSetup,
      legacyPlugins,
    });

    const coreSetup: InternalCoreSetup = {
      capabilities: capabilitiesSetup,
      context: contextServiceSetup,
      elasticsearch: elasticsearchServiceSetup,
      http: httpSetup,
      uiSettings: uiSettingsSetup,
      savedObjects: savedObjectsSetup,
      uuid: uuidSetup,
    };

    const pluginsSetup = await this.plugins.setup(coreSetup);

    const renderingSetup = await this.rendering.setup({
      http: httpSetup,
      legacyPlugins,
      plugins: pluginsSetup,
    });

    await this.legacy.setup({
      core: { ...coreSetup, plugins: pluginsSetup, rendering: renderingSetup },
      plugins: mapToObject(pluginsSetup.contracts),
    });

    this.registerCoreContext(coreSetup, renderingSetup);

    return coreSetup;
  }

  public async start() {
    this.log.debug('starting server');
    const savedObjectsStart = await this.savedObjects.start({});
    const capabilitiesStart = this.capabilities.start();
    const uiSettingsStart = await this.uiSettings.start();

    const pluginsStart = await this.plugins.start({
      capabilities: capabilitiesStart,
      savedObjects: savedObjectsStart,
      uiSettings: uiSettingsStart,
    });

    const coreStart = {
      capabilities: capabilitiesStart,
      savedObjects: savedObjectsStart,
      uiSettings: uiSettingsStart,
      plugins: pluginsStart,
    };
    await this.legacy.start({
      core: coreStart,
      plugins: mapToObject(pluginsStart.contracts),
    });

    await this.http.start();
    await this.rendering.start();

    return coreStart;
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
  }

  private registerDefaultRoute(httpSetup: InternalHttpServiceSetup) {
    const router = httpSetup.createRouter('/core');
    router.get({ path: '/', validate: false }, async (context, req, res) =>
      res.ok({ body: { version: '0.0.1' } })
    );
  }

  private registerCoreContext(coreSetup: InternalCoreSetup, rendering: RenderingServiceSetup) {
    coreSetup.http.registerRouteHandlerContext(
      coreId,
      'core',
      async (context, req, res): Promise<RequestHandlerContext['core']> => {
        const savedObjectsClient = coreSetup.savedObjects.getScopedClient(req);
        const uiSettingsClient = coreSetup.uiSettings.asScopedToClient(savedObjectsClient);

        return {
          rendering: {
            render: async (options = {}) =>
              rendering.render(req, uiSettingsClient, {
                ...options,
                vars: await this.legacy.legacyInternals!.getVars('core', req),
              }),
          },
          savedObjects: {
            client: savedObjectsClient,
          },
          elasticsearch: {
            adminClient: coreSetup.elasticsearch.adminClient.asScoped(req),
            dataClient: coreSetup.elasticsearch.dataClient.asScoped(req),
          },
          uiSettings: {
            client: uiSettingsClient,
          },
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
      [uiSettingsConfig.path, uiSettingsConfig.schema],
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
