import { ConfigService, Env } from './config';
import { HttpConfig, HttpModule, Router } from './http';
import { Logger, LoggerFactory } from './logging';

export class Server {
  private readonly http: HttpModule;
  private readonly log: Logger;

  constructor(
    private readonly configService: ConfigService,
    logger: LoggerFactory,
    env: Env
  ) {
    this.log = logger.get('server');

    const httpConfig$ = configService.atPath('server', HttpConfig);
    this.http = new HttpModule(httpConfig$, logger, env);
  }

  public async start() {
    this.log.info('starting server :tada:');

    const router = new Router('/core');
    router.get({ path: '/', validate: false }, async (req, res) =>
      res.ok({ version: '0.0.1' })
    );
    this.http.service.registerRouter(router);

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

  public async stop() {
    this.log.debug('stopping server');

    await this.http.service.stop();
  }
}
