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
import { merge } from 'lodash';
import { CoreService } from '../../types';
import { CoreContext } from '../core_context';
import { Logger } from '../logging';
import { ClusterClient } from './cluster_client';
import { ElasticsearchClientConfig } from './elasticsearch_client_config';
import { ElasticsearchConfig, ElasticsearchConfigType } from './elasticsearch_config';
import { HttpServiceSetup, GetAuthHeaders } from '../http/';

/** @internal */
interface CoreClusterClients {
  config: ElasticsearchConfig;
  adminClient: ClusterClient;
  dataClient: ClusterClient;
}

interface SetupDeps {
  http: HttpServiceSetup;
}

/** @public */
export interface ElasticsearchServiceSetup {
  // Required for the BWC with the legacy Kibana only.
  readonly legacy: {
    readonly config$: Observable<ElasticsearchConfig>;
  };
  /**
   * Create application specific Elasticsearch cluster API client with customized config.
   *
   * @param type Unique identifier of the client
   * @param clientConfig A config consists of Elasticsearch JS client options and
   * valid sub-set of Elasticsearch service config.
   * We fill all the missing properties in the `clientConfig` using the default
   * Elasticsearch config so that we don't depend on default values set and
   * controlled by underlying Elasticsearch JS client.
   * We don't run validation against passed config expect it to be valid.
   *
   * @example
   * ```js
   * const client = elasticsearch.createCluster('my-app-name', config);
   * const data = await client.callAsInternalUser();
   * ```
   */
  readonly createClient: (
    type: string,
    clientConfig?: Partial<ElasticsearchClientConfig>
  ) => ClusterClient;
  readonly adminClient$: Observable<ClusterClient>;
  readonly dataClient$: Observable<ClusterClient>;
}

/** @internal */
export class ElasticsearchService implements CoreService<ElasticsearchServiceSetup> {
  private readonly log: Logger;
  private readonly config$: Observable<ElasticsearchConfig>;
  private subscription?: Subscription;

  constructor(private readonly coreContext: CoreContext) {
    this.log = coreContext.logger.get('elasticsearch-service');
    this.config$ = coreContext.configService
      .atPath<ElasticsearchConfigType>('elasticsearch')
      .pipe(map(rawConfig => new ElasticsearchConfig(rawConfig)));
  }

  public async setup(deps: SetupDeps): Promise<ElasticsearchServiceSetup> {
    this.log.debug('Setting up elasticsearch service');

    const clients$ = this.config$.pipe(
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
              dataClient: this.createClusterClient('data', config, deps.http.auth.getAuthHeaders),
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

    const config = await this.config$.pipe(first()).toPromise();

    return {
      legacy: { config$: clients$.pipe(map(clients => clients.config)) },

      adminClient$: clients$.pipe(map(clients => clients.adminClient)),
      dataClient$: clients$.pipe(map(clients => clients.dataClient)),

      createClient: (type: string, clientConfig: Partial<ElasticsearchClientConfig> = {}) => {
        const finalConfig = merge({}, config, clientConfig);
        return this.createClusterClient(type, finalConfig, deps.http.auth.getAuthHeaders);
      },
    };
  }

  public async start() {}

  public async stop() {
    this.log.debug('Stopping elasticsearch service');

    if (this.subscription !== undefined) {
      this.subscription.unsubscribe();
      this.subscription = undefined;
    }
  }

  private createClusterClient(
    type: string,
    config: ElasticsearchClientConfig,
    getAuthHeaders?: GetAuthHeaders
  ) {
    return new ClusterClient(
      config,
      this.coreContext.logger.get('elasticsearch', type),
      getAuthHeaders
    );
  }
}
