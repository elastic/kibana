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

import { ConnectableObservable, Observable, Subscription } from 'rxjs';
import { filter, first, map, publishReplay, switchMap } from 'rxjs/operators';
import { CoreContext, CoreService } from '../../types';
import { Logger } from '../logging';
import {
  ClusterClient,
  ClusterClientConfigOptions,
  getClusterClientConfig,
} from './cluster_client';
import { ElasticsearchConfig } from './elasticsearch_config';

interface CoreClusterClients {
  config: ElasticsearchConfig;
  admin: ClusterClient;
  data: ClusterClient;
}

/** @internal */
export interface ElasticsearchServiceStartContract {
  // Required by the BWC only.
  readonly bwcConfig: ElasticsearchConfig;

  readonly createClient: ElasticsearchService['createClient'];
  readonly adminClient$: Observable<ClusterClient>;
  readonly dataClient$: Observable<ClusterClient>;
}

/** @internal */
export class ElasticsearchService implements CoreService<ElasticsearchServiceStartContract> {
  private readonly log: Logger;
  private subscription?: Subscription;

  constructor(private readonly coreContext: CoreContext) {
    this.log = coreContext.logger.get('elasticsearch-service');
  }

  public async start(): Promise<ElasticsearchServiceStartContract> {
    this.log.debug('Starting elasticsearch service');

    const clients$ = this.coreContext.configService
      .atPath('elasticsearch', ElasticsearchConfig)
      .pipe(
        filter(() => {
          if (this.subscription !== undefined) {
            this.log.error('Clients cannot be changed after they are created');
            return false;
          }

          return true;
        }),
        switchMap(
          config =>
            new Observable<CoreClusterClients>(subscriber => {
              this.log.debug(`Creating elasticsearch clients`);

              const coreClients = {
                config,
                admin: this.createClient('admin', config.toClientConfig()),
                data: this.createClient('data', config.toClientConfig()),
              };

              subscriber.next(coreClients);

              return () => {
                this.log.debug(`Closing elasticsearch clients`);

                coreClients.admin.close();
                coreClients.data.close();
              };
            })
        ),
        publishReplay(1)
      ) as ConnectableObservable<CoreClusterClients>;

    this.subscription = clients$.connect();

    return {
      bwcConfig: await clients$
        .pipe(
          first(),
          map(clients => clients.config)
        )
        .toPromise(),
      createClient: this.createClient.bind(this),
      adminClient$: clients$.pipe(map(clients => clients.admin)),
      dataClient$: clients$.pipe(map(clients => clients.data)),
    };
  }

  public async stop() {
    this.log.debug('Stopping elasticsearch service');

    if (this.subscription !== undefined) {
      this.subscription.unsubscribe();
      this.subscription = undefined;
    }
  }

  private createClient(type: string, config: ClusterClientConfigOptions) {
    return new ClusterClient(
      getClusterClientConfig(config),
      this.coreContext.logger.get('elasticsearch', type)
    );
  }
}
