import { ConfigService, Env } from '../config';
import { HttpModule, HttpConfig } from './http';
import { ElasticsearchModule, ElasticsearchConfigs } from './elasticsearch';
import { KibanaModule, KibanaConfig } from './kibana';
import { Logger, LoggerFactory } from '../logging';
import { PluginsConfig } from './plugins/PluginsConfig';
import { PluginsService } from './plugins/PluginsService';
import { PluginSystem } from './plugins/PluginSystem';

export class Server {
  private readonly elasticsearch: ElasticsearchModule;
  private readonly http: HttpModule;
  private readonly kibana: KibanaModule;
  private readonly plugins: PluginsService;
  private readonly log: Logger;

  constructor(
    private readonly configService: ConfigService,
    logger: LoggerFactory,
    env: Env
  ) {
    this.log = logger.get('server');

    const kibanaConfig$ = configService.atPath('kibana', KibanaConfig);
    const httpConfig$ = configService.atPath('server', HttpConfig);
    const elasticsearchConfigs$ = configService.atPath(
      'elasticsearch',
      ElasticsearchConfigs
    );
    const pluginsConfig$ = configService.atPath(
      ['__newPlatform', 'plugins'],
      PluginsConfig
    );

    this.elasticsearch = new ElasticsearchModule(elasticsearchConfigs$, logger);
    this.kibana = new KibanaModule(kibanaConfig$);
    this.http = new HttpModule(httpConfig$, logger, env);

    const core = {
      elasticsearch: this.elasticsearch,
      kibana: this.kibana,
      http: this.http,
      configService,
      logger
    };

    this.plugins = new PluginsService(
      pluginsConfig$,
      new PluginSystem(core, logger),
      configService,
      logger
    );
  }

  async start() {
    this.log.info('starting server :tada:');

    this.http.service.registerRouter(this.elasticsearch.createRoutes());

    await this.elasticsearch.service.start();
    await this.plugins.start();
    await this.http.service.start();

    const unhandledConfigPaths = await this.configService.getUnusedPaths();
    if (unhandledConfigPaths.length > 0) {
      throw new Error(
        `some config paths are not handled: ${JSON.stringify(
          unhandledConfigPaths
        )}`
      );
    }
  }

  async stop() {
    this.log.debug('stopping server');

    await this.http.service.stop();
    await this.plugins.stop();
    await this.elasticsearch.service.stop();
  }
}
