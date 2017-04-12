// @flow

import { Observable, Subscription } from 'rxjs';

import { HttpConfig, schema } from './HttpConfig';

export { HttpConfig, schema };

export class Http {
  config$: Observable<HttpConfig>;
  subscription: Subscription | void;

  constructor(config$: Observable<HttpConfig>) {
    this.config$ = config$;
  }

  start() {
    this.subscription = this.config$.subscribe(config => {
      console.log(config);
    });
  }

  stop() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
