import { ConfigService } from '../config';
import { HttpModule, HttpConfig } from './http';
import { ElasticsearchModule, ElasticsearchConfigs } from './elasticsearch';
import { KibanaModule, KibanaConfig } from './kibana';
import { Logger, LoggerFactory } from '../logger';
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
    logger: LoggerFactory
  ) {
    this.log = logger.get('server');

    const kibanaConfig$ = configService.atPath('kibana', KibanaConfig);
    const httpConfig$ = configService.atPath('server', HttpConfig);
    const elasticsearchConfigs$ = configService.atPath(
      'elasticsearch',
      ElasticsearchConfigs
    );

    this.elasticsearch = new ElasticsearchModule(elasticsearchConfigs$, logger);
    this.kibana = new KibanaModule(kibanaConfig$);
    this.http = new HttpModule(httpConfig$, logger);

    const core = {
      elasticsearch: this.elasticsearch,
      kibana: this.kibana,
      http: this.http,
      configService,
      logger
    };

    this.plugins = new PluginsService(
      configService.env.pluginsDir,
      new PluginSystem(core, logger),
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

  stop() {
    this.log.debug('stopping server');

    this.http.service.stop();
    this.plugins.stop();
    this.elasticsearch.service.stop();
  }
}
