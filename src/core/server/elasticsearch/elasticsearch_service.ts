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

// @ts-ignore don't type elasticsearch now
import { Client } from 'elasticsearch';
import { combineLatest, Observable, Subscription } from 'rxjs';
import { filter, first, map, publishLast, switchMap } from 'rxjs/operators';
import { CoreService } from '../../types/core_service';
import { Headers } from '../http/router/headers';
import { LoggerFactory } from '../logging';
import { AdminClient } from './admin_client';
import { ElasticsearchConfigs } from './elasticsearch_configs';
import { ScopedDataClient } from './scoped_data_client';

interface Clients {
  admin: Client;
  data: Client;
}

export class ElasticsearchService implements CoreService {
  private clients$: Observable<Clients>;
  private subscription?: Subscription;

  constructor(private readonly configs$: Observable<ElasticsearchConfigs>, logger: LoggerFactory) {
    const log = logger.get('elasticsearch');

    this.clients$ = configs$.pipe(
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
              data: new Client(configs.forType('data').toElasticsearchClientConfig()),
            };

            observer.next(clients);

            return () => {
              log.info('closing Elasticsearch clients');

              clients.data.close();
              clients.admin.close();
            };
          })
      ),
      publishLast()
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
    return this.clients$.pipe(map(clients => new AdminClient(clients.admin)));
  }

  public getScopedDataClient$(headers: Headers) {
    return combineLatest(this.clients$, this.configs$).pipe(
      map(
        ([clients, configs]) =>
          new ScopedDataClient(clients.data, configs.forType('data').filterHeaders(headers))
      )
    );
  }

  public getScopedDataClient(headers: Headers) {
    return this.getScopedDataClient$(headers)
      .pipe(first())
      .toPromise();
  }
}
