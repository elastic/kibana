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
import { filter, first, publishReplay, switchMap } from 'rxjs/operators';
import { CoreContext, CoreService } from '../../types';
import { Logger } from '../logging';
import { ClusterClient } from './cluster_client';
import { ElasticsearchClientConfig } from './elasticsearch_client_config';
import { ElasticsearchConfig } from './elasticsearch_config';

interface CoreClusterClients {
  config: ElasticsearchConfig;
  adminClient: ClusterClient;
  dataClient: ClusterClient;
}

/** @internal */
export interface ElasticsearchServiceStartContract {
  // Required for the BWC only.
  readonly bwc: {
    readonly config: ElasticsearchConfig;
  };

  readonly apiVersion: ElasticsearchConfig['apiVersion'];
  readonly requestTimeout: ElasticsearchConfig['requestTimeout'];
  readonly shardTimeout: ElasticsearchConfig['shardTimeout'];

  readonly createClient: (
    type: string,
    config?: Partial<ElasticsearchClientConfig>
  ) => ClusterClient;
  readonly adminClient: ClusterClient;
  readonly dataClient: ClusterClient;
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
                adminClient: this.createClusterClient('admin', config),
                dataClient: this.createClusterClient('data', config),
              };

              subscriber.next(coreClients);

              return () => {
                this.log.debug(`Closing elasticsearch clients`);

                coreClients.adminClient.close();
                coreClients.dataClient.close();
              };
            })
        ),
        publishReplay(1)
      ) as ConnectableObservable<CoreClusterClients>;

    this.subscription = clients$.connect();

    const { config: defaultConfig, adminClient, dataClient } = await clients$
      .pipe(first())
      .toPromise();

    return {
      bwc: { config: defaultConfig },

      apiVersion: defaultConfig.apiVersion,
      requestTimeout: defaultConfig.requestTimeout,
      shardTimeout: defaultConfig.shardTimeout,

      adminClient,
      dataClient,

      createClient: (type: string, clientConfig: Partial<ElasticsearchClientConfig> = {}) => {
        return this.createClusterClient(type, {
          ...(defaultConfig as ElasticsearchClientConfig),
          ...clientConfig,
        });
      },
    };
  }

  public async stop() {
    this.log.debug('Stopping elasticsearch service');

    if (this.subscription !== undefined) {
      this.subscription.unsubscribe();
      this.subscription = undefined;
    }
  }

  private createClusterClient(type: string, config: ElasticsearchClientConfig) {
    return new ClusterClient(
      config,
      this.coreContext.logger.get('elasticsearch', config.loggerContext || type)
    );
  }
}
