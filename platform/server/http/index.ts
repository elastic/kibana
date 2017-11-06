import { Observable } from '@elastic/kbn-observable';

import { Env } from '../../config';
import { HttpService } from './HttpService';
import { HttpConfig } from './HttpConfig';
import { LoggerFactory } from '../../logging';

export { Router, RouterOptions, KibanaRequest } from './Router';
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
