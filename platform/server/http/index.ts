import { Observable } from 'rxjs';

import { HttpService } from './HttpService';
import { HttpConfig } from './HttpConfig';
import { LoggerFactory } from '../../logging';

export { Router, RouterOptions } from './Router';
export { KibanaRequest } from './Router/Request';
export { HttpService };

export { HttpConfig };

export class HttpModule {
  readonly service: HttpService;

  constructor(readonly config$: Observable<HttpConfig>, logger: LoggerFactory) {
    this.service = new HttpService(this.config$, logger);
  }
}
