/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { first, k$, map, toPromise } from '../../lib/kbn_observable';

import { BehaviorSubject, Subscription } from 'rxjs';
import { CoreService } from '../../types/core_service';
import { Env } from '../config';
// import { HttpService, Router } from '../http';
// import { Logger, LoggerFactory } from '../logging';
// do we need elasticsearch service here?
// import { ElasticsearchService } from '../elasticsearch';
import { Client, ScopedClient } from './client';
import { Context } from './types/context';

export class SavedObjectsService implements CoreService {
  private client$: BehaviorSubject<Client>;

  // TODO: unused values
  // private readonly log: Logger;
  // private readonly http: HttpService;

  private clientFactorySubscription?: Subscription;
  private clientSubscription?: Subscription;

  private clientFactory$: BehaviorSubject<
    (context: Context) => Promise<ScopedClient>
  >;

  private options = {
    // index: '.kibana',
    // mappings,
    // callCluster
  };

  constructor(
    httpService: HttpService,
    // receive elasticsearch service here too?
    logger: LoggerFactory,
    env: Env,
    clientFactory?: () => Promise<ScopedClient>
  ) {
    this.log = logger.get('savedObjects');
    this.http = httpService;

    // internal client is always the raw Client
    // this is only an observable to keep track of the sole client
    // that should exist. currently nothing updates this, but we
    // could design it so that it recreates with some config
    // on SIGHUPs
    this.client$ = new BehaviorSubject(new Client(this.options));

    // the current value of the client factory
    // we want this to be Observable because it can be updated by plugins
    // TODO: returns a promise, should it?
    this.clientFactory$ = new BehaviorSubject(async (context: Context) => {
      const client = await k$(this.client$)(first(), toPromise());
      return new ScopedClient(client, context);
    });
  }

  public async start() {
    this.clientFactorySubscription = this.clientFactory$.subscribe();

    this.clientSubscription = this.client$
      .subscribe()
      .add(this.clientFactorySubscription);
  }

  public async stop() {
    if (this.clientSubscription !== undefined) {
      this.clientSubscription.unsubscribe();
      this.clientSubscription = undefined;
      this.clientFactorySubscription = undefined;
    }
  }

  // when someone registers a new client factory, replace the client factory
  public registerClientFactory(
    factory: (context: Context) => Promise<ScopedClient>
  ) {
    this.clientFactory$.next(factory);
  }

  // maybe the plugin contract only lets you get this observable
  // and subscribe/handle the updates itself
  public getScopedClient$(context: Context) {
    return k$(this.clientFactory$)(
      map(clientFactory => {
        return clientFactory(context);
      })
    );
  }

  // when someone wants the actual client, they call this method
  // creates a scoped client. context probably comes from the request
  //
  // maybe internal core libs use this?
  public getScopedClient(context: Context) {
    return k$(this.getScopedClient$(context))(first(), toPromise());
  }
}
