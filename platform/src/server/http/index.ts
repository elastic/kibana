import { Observable } from '@kbn/observable';

import { Env } from '../../config';
import { HttpService } from './http_service';
import { HttpConfig } from './http_config';
import { LoggerFactory } from '../../logging';

export { Router, KibanaRequest } from './router';
export { HttpService };

export { HttpConfig };

export class HttpModule {
  readonly service: HttpService;

  constructor(
    readonly config$: Observable<HttpConfig>,
    logger: LoggerFactory,
    env: Env
  ) {
    this.service = new HttpService(this.config$, logger, env);
  }
}
