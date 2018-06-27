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

import {
  $combineLatest,
  filter,
  first,
  k$,
  map,
  Observable,
  shareLast,
  Subscription,
  switchMap,
  toPromise,
} from '@kbn/observable';
import { Client } from 'elasticsearch';

import { LoggerFactory } from '../../logging';
import { CoreService } from '../../types/core_service';
import { Headers } from '../http/router/headers';
import { AdminClient } from './admin_client';
import { ElasticsearchConfigs } from './elasticsearch_configs';
import { ScopedDataClient } from './scoped_data_client';

interface Clients {
  data: Client;
  admin: Client;
}

export class ElasticsearchService implements CoreService {
  private clients$: Observable<Clients>;
  private subscription?: Subscription;

  constructor(
    private readonly configs$: Observable<ElasticsearchConfigs>,
    logger: LoggerFactory
  ) {
    const log = logger.get('elasticsearch');

    this.clients$ = k$(configs$)(
      filter(() => {
        if (this.subscription !== undefined) {
          log.error('clusters cannot be changed after they are created');
          return false;
        }

        return true;
      }),
      switchMap(
        configs =>
          new Observable<Clients>(observer => {
            log.info('creating Elasticsearch clients');

            const clients = {
              admin: new Client(
                configs.forType('admin').toElasticsearchClientConfig({
                  shouldAuth: false,
                })
              ),
              data: new Client(
                configs.forType('data').toElasticsearchClientConfig()
              ),
            };

            observer.next(clients);

            return () => {
              log.info('closing Elasticsearch clients');

              clients.data.close();
              clients.admin.close();
            };
          })
      ),
      // We only want a single subscription of this as we only want to create a
      // single set of clients at a time. We therefore share these, plus we
      // always replay the latest set of clusters when subscribing.
      shareLast()
    );
  }

  public async start() {
    // ensure that we don't unnecessarily re-create clients by always having
    // at least one current connection
    this.subscription = this.clients$.subscribe();
  }

  public async stop() {
    if (this.subscription !== undefined) {
      this.subscription.unsubscribe();
    }
  }

  public getAdminClient$() {
    return k$(this.clients$)(map(clients => new AdminClient(clients.admin)));
  }

  public getScopedDataClient$(headers: Headers) {
    return k$($combineLatest(this.clients$, this.configs$))(
      map(
        ([clients, configs]) =>
          new ScopedDataClient(
            clients.data,
            configs.forType('data').filterHeaders(headers)
          )
      )
    );
  }

  public getScopedDataClient(headers: Headers) {
    return k$(this.getScopedDataClient$(headers))(first(), toPromise());
  }
}
