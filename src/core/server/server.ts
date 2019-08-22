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
import { take } from 'rxjs/operators';
import { Type } from '@kbn/config-schema';

import { ConfigService, Env, Config, ConfigPath } from './config';
import { ElasticsearchService } from './elasticsearch';
import { HttpService, HttpServiceSetup } from './http';
import { LegacyService } from './legacy';
import { Logger, LoggerFactory } from './logging';
import { PluginsService, config as pluginsConfig } from './plugins';
import { SavedObjectsService } from '../server/saved_objects';

import { config as elasticsearchConfig } from './elasticsearch';
import { config as httpConfig } from './http';
import { config as loggingConfig } from './logging';
import { config as devConfig } from './dev';
import { config as kibanaConfig } from './kibana_config';
import { mapToObject } from '../utils/';
import { ContextService } from './context';
import { InternalCoreSetup } from './index';

const coreId = Symbol('core');

export class Server {
  public readonly configService: ConfigService;
  private readonly context: ContextService;
  private readonly elasticsearch: ElasticsearchService;
  private readonly http: HttpService;
  private readonly legacy: LegacyService;
  private readonly log: Logger;
  private readonly plugins: PluginsService;
  private readonly savedObjects: SavedObjectsService;

  constructor(
    readonly config$: Observable<Config>,
    readonly env: Env,
    private readonly logger: LoggerFactory
  ) {
    this.log = this.logger.get('server');
    this.configService = new ConfigService(config$, env, logger);

    const core = { coreId, configService: this.configService, env, logger };
    this.context = new ContextService(core);
    this.http = new HttpService(core);
    this.plugins = new PluginsService(core);
    this.legacy = new LegacyService(core);
    this.elasticsearch = new ElasticsearchService(core);
    this.savedObjects = new SavedObjectsService(core);
  }

  public async setup() {
    this.log.debug('setting up server');

    // Discover any plugins before continuing. This allows other systems to utilize the plugin dependency graph.
    const pluginDependencies = await this.plugins.discover();
    const contextServiceSetup = this.context.setup({ pluginDependencies });

    const httpSetup = await this.http.setup({
      context: contextServiceSetup,
    });

    this.registerDefaultRoute(httpSetup);

    const elasticsearchServiceSetup = await this.elasticsearch.setup({
      http: httpSetup,
    });

    const coreSetup = {
      context: contextServiceSetup,
      elasticsearch: elasticsearchServiceSetup,
      http: httpSetup,
    };

    this.registerCoreContext(coreSetup);
    const pluginsSetup = await this.plugins.setup(coreSetup);

    const legacySetup = await this.legacy.setup({
      core: { ...coreSetup, plugins: pluginsSetup },
      plugins: mapToObject(pluginsSetup.contracts),
    });

    await this.savedObjects.setup({
      elasticsearch: elasticsearchServiceSetup,
      legacy: legacySetup,
    });

    return coreSetup;
  }

  public async start() {
    const pluginsStart = await this.plugins.start({});
    const savedObjectsStart = await this.savedObjects.start({});

    const coreStart = {
      savedObjects: savedObjectsStart,
      plugins: pluginsStart,
    };

    await this.legacy.start({
      core: coreStart,
      plugins: mapToObject(pluginsStart.contracts),
    });

    /**
     * Note: ideally we'd like to wait for migrations to complete before
     * loading the legacy service which in turn starts legacy plugins. But,
     * our build process relies on the optimize phase being able to run
     * without a running ES server. Optimize in turn depends on the legacy
     * server being started. So until optimization has been moved to the
     * NP we move migrations till after legacy.start() and only if we're not
     * running optimize.
     */
    if (!this.env.cliArgs.optimize) {
      await savedObjectsStart.migrator.awaitMigration();
    }

    await this.http.start();

    return coreStart;
  }

  public async stop() {
    this.log.debug('stopping server');

    await this.legacy.stop();
    await this.plugins.stop();
    await this.savedObjects.stop();
    await this.elasticsearch.stop();
    await this.http.stop();
  }

  private registerDefaultRoute(httpSetup: HttpServiceSetup) {
    const router = httpSetup.createRouter('/core');
    router.get({ path: '/', validate: false }, async (context, req, res) =>
      res.ok({ version: '0.0.1' })
    );
  }

  private registerCoreContext(coreSetup: InternalCoreSetup) {
    coreSetup.http.registerRouteHandlerContext(coreId, 'core', async (context, req) => {
      const adminClient = await coreSetup.elasticsearch.adminClient$.pipe(take(1)).toPromise();
      const dataClient = await coreSetup.elasticsearch.dataClient$.pipe(take(1)).toPromise();
      return {
        elasticsearch: {
          adminClient: adminClient.asScoped(req),
          dataClient: dataClient.asScoped(req),
        },
      };
    });
  }

  public async setupConfigSchemas() {
    const schemas: Array<[ConfigPath, Type<unknown>]> = [
      [elasticsearchConfig.path, elasticsearchConfig.schema],
      [loggingConfig.path, loggingConfig.schema],
      [httpConfig.path, httpConfig.schema],
      [pluginsConfig.path, pluginsConfig.schema],
      [devConfig.path, devConfig.schema],
      [kibanaConfig.path, kibanaConfig.schema],
    ];

    for (const [path, schema] of schemas) {
      await this.configService.setSchema(path, schema);
    }
  }
}
