import { Observable } from '../../lib/kbn_observable';

import { Env } from '../config';
import { LoggerFactory } from '../logging';
import { HttpConfig } from './http_config';
import { HttpService } from './http_service';

export { Router, KibanaRequest } from './router';
export { HttpService };

export { HttpConfig };

export class HttpModule {
  public readonly service: HttpService;

  constructor(
    readonly config$: Observable<HttpConfig>,
    logger: LoggerFactory,
    env: Env
  ) {
    this.service = new HttpService(this.config$, logger, env);
  }
}
