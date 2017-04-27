// @flow

import { Observable, Subscription } from 'rxjs';

import { Config } from '../Config';
import { Http, HttpConfig } from '../http';

export class Server {
  config$: Observable<Config>;
  http: Http;
  subscription: Subscription | void;

  constructor(config$: Observable<Config>) {
    this.config$ = config$;

    this.http = new Http(
      config$.map(config => new HttpConfig(config.atPath('server')))
    );
  }

  start() {
    this.http.start();

    this.subscription = this.config$.subscribe(config => {
      console.log('\nserver config', config);
    });
  }

  stop() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
