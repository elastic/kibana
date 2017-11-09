import {
  Observable,
  Subscription,
  k$,
  first,
  toPromise
} from '@elastic/kbn-observable';

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
    this.configSubscription = this.config$.subscribe(() => {
      if (this.httpServer.isListening()) {
        // If the server is already running we can't make any config changes
        // to it, so we warn and don't allow the config to pass through.
        this.log.warn(
          'Received new HTTP config after server was started. ' +
            'Config will **not** be applied.'
        );
      }
    });

    const config = await k$(this.config$)(first(), toPromise());
    await this.httpServer.start(config);
  }

  async stop() {
    if (this.configSubscription === undefined) {
      return;
    }

    this.configSubscription.unsubscribe();
    this.configSubscription = undefined;

    await this.httpServer.stop();
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
}
