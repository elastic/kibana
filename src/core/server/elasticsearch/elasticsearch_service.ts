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

import { ConnectableObservable, Observable, Subscription, Subject } from 'rxjs';
import {
  filter,
  first,
  map,
  publishReplay,
  switchMap,
  take,
  shareReplay,
  takeUntil,
} from 'rxjs/operators';

import { CoreService } from '../../types';
import { merge } from '../../utils';
import { CoreContext } from '../core_context';
import { Logger } from '../logging';
import { ClusterClient, ScopeableRequest } from './cluster_client';
import { ElasticsearchClientConfig } from './elasticsearch_client_config';
import { ElasticsearchConfig, ElasticsearchConfigType } from './elasticsearch_config';
import { InternalHttpServiceSetup, GetAuthHeaders } from '../http/';
import { InternalElasticsearchServiceSetup } from './types';
import { CallAPIOptions } from './api_types';
import { pollEsNodesVersion } from './version_check/ensure_es_version';

/** @internal */
interface CoreClusterClients {
  config: ElasticsearchConfig;
  adminClient: ClusterClient;
  dataClient: ClusterClient;
}

interface SetupDeps {
  http: InternalHttpServiceSetup;
}

/** @internal */
export class ElasticsearchService implements CoreService<InternalElasticsearchServiceSetup> {
  private readonly log: Logger;
  private readonly config$: Observable<ElasticsearchConfig>;
  private subscription: Subscription | undefined;
  private stop$ = new Subject();
  private kibanaVersion: string;

  constructor(private readonly coreContext: CoreContext) {
    this.kibanaVersion = coreContext.env.packageInfo.version;
    this.log = coreContext.logger.get('elasticsearch-service');
    this.config$ = coreContext.configService
      .atPath<ElasticsearchConfigType>('elasticsearch')
      .pipe(map(rawConfig => new ElasticsearchConfig(rawConfig)));
  }

  public async setup(deps: SetupDeps): Promise<InternalElasticsearchServiceSetup> {
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

    const adminClient$ = clients$.pipe(map(clients => clients.adminClient));
    const dataClient$ = clients$.pipe(map(clients => clients.dataClient));

    const adminClient = {
      async callAsInternalUser(
        endpoint: string,
        clientParams: Record<string, any> = {},
        options?: CallAPIOptions
      ) {
        const client = await adminClient$.pipe(take(1)).toPromise();
        return await client.callAsInternalUser(endpoint, clientParams, options);
      },
      asScoped(request: ScopeableRequest) {
        return {
          callAsInternalUser: adminClient.callAsInternalUser,
          async callAsCurrentUser(
            endpoint: string,
            clientParams: Record<string, any> = {},
            options?: CallAPIOptions
          ) {
            const client = await adminClient$.pipe(take(1)).toPromise();
            return await client
              .asScoped(request)
              .callAsCurrentUser(endpoint, clientParams, options);
          },
        };
      },
    };
    const dataClient = {
      async callAsInternalUser(
        endpoint: string,
        clientParams: Record<string, any> = {},
        options?: CallAPIOptions
      ) {
        const client = await dataClient$.pipe(take(1)).toPromise();
        return await client.callAsInternalUser(endpoint, clientParams, options);
      },
      asScoped(request: ScopeableRequest) {
        return {
          callAsInternalUser: dataClient.callAsInternalUser,
          async callAsCurrentUser(
            endpoint: string,
            clientParams: Record<string, any> = {},
            options?: CallAPIOptions
          ) {
            const client = await dataClient$.pipe(take(1)).toPromise();
            return await client
              .asScoped(request)
              .callAsCurrentUser(endpoint, clientParams, options);
          },
        };
      },
    };

    const esNodesCompatibility$ = pollEsNodesVersion({
      callWithInternalUser: adminClient.callAsInternalUser,
      log: this.log,
      ignoreVersionMismatch: config.ignoreVersionMismatch,
      esVersionCheckInterval: config.healthCheckDelay.asMilliseconds(),
      kibanaVersion: this.kibanaVersion,
    }).pipe(takeUntil(this.stop$), shareReplay({ refCount: true, bufferSize: 1 }));

    return {
      legacy: { config$: clients$.pipe(map(clients => clients.config)) },

      adminClient,
      dataClient,
      esNodesCompatibility$,

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
    }
    this.stop$.next();
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
