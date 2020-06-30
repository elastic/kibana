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

import { Observable, Subject } from 'rxjs';
import { first, map, shareReplay, takeUntil } from 'rxjs/operators';

import { CoreService } from '../../types';
import { merge } from '../../utils';
import { CoreContext } from '../core_context';
import { Logger } from '../logging';
import {
  LegacyClusterClient,
  ILegacyCustomClusterClient,
  LegacyElasticsearchClientConfig,
} from './legacy';
import { ElasticsearchConfig, ElasticsearchConfigType } from './elasticsearch_config';
import { InternalHttpServiceSetup, GetAuthHeaders } from '../http/';
import { InternalElasticsearchServiceSetup, ElasticsearchServiceStart } from './types';
import { pollEsNodesVersion } from './version_check/ensure_es_version';
import { calculateStatus$ } from './status';

interface SetupDeps {
  http: InternalHttpServiceSetup;
}

/** @internal */
export class ElasticsearchService
  implements CoreService<InternalElasticsearchServiceSetup, ElasticsearchServiceStart> {
  private readonly log: Logger;
  private readonly config$: Observable<ElasticsearchConfig>;
  private stop$ = new Subject();
  private kibanaVersion: string;
  private createLegacyClient?: (
    type: string,
    clientConfig?: Partial<LegacyElasticsearchClientConfig>
  ) => ILegacyCustomClusterClient;
  private legacyClient?: LegacyClusterClient;

  constructor(private readonly coreContext: CoreContext) {
    this.kibanaVersion = coreContext.env.packageInfo.version;
    this.log = coreContext.logger.get('elasticsearch-service');
    this.config$ = coreContext.configService
      .atPath<ElasticsearchConfigType>('elasticsearch')
      .pipe(map((rawConfig) => new ElasticsearchConfig(rawConfig)));
  }

  public async setup(deps: SetupDeps): Promise<InternalElasticsearchServiceSetup> {
    this.log.debug('Setting up elasticsearch service');

    const config = await this.config$.pipe(first()).toPromise();
    this.legacyClient = this.createLegacyClusterClient('data', config, deps.http.getAuthHeaders);

    const esNodesCompatibility$ = pollEsNodesVersion({
      callWithInternalUser: this.legacyClient.callAsInternalUser,
      log: this.log,
      ignoreVersionMismatch: config.ignoreVersionMismatch,
      esVersionCheckInterval: config.healthCheckDelay.asMilliseconds(),
      kibanaVersion: this.kibanaVersion,
    }).pipe(takeUntil(this.stop$), shareReplay({ refCount: true, bufferSize: 1 }));

    this.createLegacyClient = (
      type: string,
      clientConfig: Partial<LegacyElasticsearchClientConfig> = {}
    ) => {
      const finalConfig = merge({}, config, clientConfig);
      return this.createLegacyClusterClient(type, finalConfig, deps.http.getAuthHeaders);
    };

    return {
      legacy: {
        config$: this.config$,
        client: this.legacyClient,
        createClient: this.createLegacyClient,
      },
      esNodesCompatibility$,
      status$: calculateStatus$(esNodesCompatibility$),
    };
  }
  public async start(): Promise<ElasticsearchServiceStart> {
    if (
      typeof this.legacyClient === 'undefined' ||
      typeof this.createLegacyClient === 'undefined'
    ) {
      throw new Error('ElasticsearchService needs to be setup before calling start');
    } else {
      return {
        legacy: {
          client: this.legacyClient,
          createClient: this.createLegacyClient,
        },
      };
    }
  }

  public async stop() {
    this.log.debug('Stopping elasticsearch service');
    this.stop$.next();
    if (this.legacyClient) {
      this.legacyClient.close();
    }
  }

  private createLegacyClusterClient(
    type: string,
    config: LegacyElasticsearchClientConfig,
    getAuthHeaders?: GetAuthHeaders
  ) {
    return new LegacyClusterClient(
      config,
      this.coreContext.logger.get('elasticsearch', type),
      getAuthHeaders
    );
  }
}
