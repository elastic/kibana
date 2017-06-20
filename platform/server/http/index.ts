import { Observable } from 'rxjs';

import { HttpService } from './HttpService';
import { HttpConfig } from './HttpConfig';
import { LoggerFactory } from '../../logger';

export { Router, RouterOptions, KibanaRequest } from './Router';
export { HttpService };

export { HttpConfig };

export class HttpModule {
  readonly service: HttpService;

  constructor(
    readonly config$: Observable<HttpConfig>,
    logger: LoggerFactory
  ) {
    this.service = new HttpService(this.config$, logger);
  }
}