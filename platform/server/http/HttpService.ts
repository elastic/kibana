import { Observable, Subscription } from 'rxjs';

import { Env } from '../../config';
import { HttpServer } from './HttpServer';
import { HttpConfig } from './HttpConfig';
import { Logger, LoggerFactory } from '../../logging';
import { Router } from './Router';
import { CoreService } from '../../types/CoreService';

export class HttpService implements CoreService {
  private readonly httpServer: HttpServer;
  private configSubscription?: Subscription;

  private readonly log: Logger;

  constructor(
    private readonly config$: Observable<HttpConfig>,
    logger: LoggerFactory,
    env: Env
  ) {
    this.log = logger.get('http');
    this.httpServer = new HttpServer(logger.get('http', 'server'), env);
  }

  async start() {
    this.configSubscription = this.config$
      .filter(config => {
        if (this.httpServer.isListening()) {
          // If the server is already running we can't make any config changes
          // to it, so we warn and don't allow the config to pass through.
          this.log.error(
            'Received new HTTP config after server was started. ' +
              'Config will **not** be applied.'
          );
          return false;
        }

        return true;
      })
      .switchMap(
        config =>
          new Observable<void>(() => {
            this.startHttpServer(config);

            return () => {
              // TODO: This is async! :/
              this.stopHttpServer();
            };
          })
      )
      .subscribe();
  }

  async stop() {
    if (this.configSubscription !== undefined) {
      this.configSubscription.unsubscribe();
    }
  }

  registerRouter(router: Router<any>): void {
    if (this.httpServer.isListening()) {
      // If the server is already running we can't make any config changes
      // to it, so we warn and don't allow the config to pass through.
      // TODO Should we throw instead?
      this.log.error(
        `Received new router [${router.path}] after server was started. ` +
          'Router will **not** be applied.'
      );
    } else {
      this.log.info(`registering route handler for [${router.path}]`);
      this.httpServer.registerRouter(router);
    }
  }

  private async startHttpServer(config: HttpConfig) {
    const { host, port } = config;

    this.log.info(`starting http server [${host}:${port}]`);

    await this.httpServer.start(port, host);
  }

  private stopHttpServer() {
    this.log.debug('closing http server');
    this.httpServer.stop();
  }
}
