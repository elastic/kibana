/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Observable, Subject } from 'rxjs';
import { first, map, shareReplay, takeUntil } from 'rxjs/operators';
import { merge } from '@kbn/std';

import { CoreService } from '../../types';
import { CoreContext } from '../core_context';
import { Logger } from '../logging';
import {
  LegacyClusterClient,
  ILegacyCustomClusterClient,
  LegacyElasticsearchClientConfig,
} from './legacy';
import { ClusterClient, ElasticsearchClientConfig } from './client';
import { ElasticsearchConfig, ElasticsearchConfigType } from './elasticsearch_config';
import type { InternalHttpServiceSetup, GetAuthHeaders } from '../http';
import type { InternalExecutionContextSetup, IExecutionContext } from '../execution_context';
import {
  InternalElasticsearchServicePreboot,
  InternalElasticsearchServiceSetup,
  InternalElasticsearchServiceStart,
} from './types';
import { pollEsNodesVersion } from './version_check/ensure_es_version';
import { calculateStatus$ } from './status';

interface SetupDeps {
  http: InternalHttpServiceSetup;
  executionContext: InternalExecutionContextSetup;
}

/** @internal */
export class ElasticsearchService
  implements CoreService<InternalElasticsearchServiceSetup, InternalElasticsearchServiceStart> {
  private readonly log: Logger;
  private readonly config$: Observable<ElasticsearchConfig>;
  private stop$ = new Subject();
  private kibanaVersion: string;
  private getAuthHeaders?: GetAuthHeaders;
  private executionContextClient?: IExecutionContext;

  private createLegacyCustomClient?: (
    type: string,
    clientConfig?: Partial<LegacyElasticsearchClientConfig>
  ) => ILegacyCustomClusterClient;
  private legacyClient?: LegacyClusterClient;

  private client?: ClusterClient;

  constructor(private readonly coreContext: CoreContext) {
    this.kibanaVersion = coreContext.env.packageInfo.version;
    this.log = coreContext.logger.get('elasticsearch-service');
    this.config$ = coreContext.configService
      .atPath<ElasticsearchConfigType>('elasticsearch')
      .pipe(map((rawConfig) => new ElasticsearchConfig(rawConfig)));
  }

  public async preboot(): Promise<InternalElasticsearchServicePreboot> {
    this.log.debug('Prebooting elasticsearch service');

    const config = await this.config$.pipe(first()).toPromise();
    return {
      config: {
        hosts: config.hosts,
        credentialsSpecified:
          config.username !== undefined ||
          config.password !== undefined ||
          config.serviceAccountToken !== undefined,
      },
      createClient: (type, clientConfig) => this.createClusterClient(type, config, clientConfig),
    };
  }

  public async setup(deps: SetupDeps): Promise<InternalElasticsearchServiceSetup> {
    this.log.debug('Setting up elasticsearch service');

    const config = await this.config$.pipe(first()).toPromise();

    this.getAuthHeaders = deps.http.getAuthHeaders;
    this.executionContextClient = deps.executionContext;
    this.legacyClient = this.createLegacyClusterClient('data', config);
    this.client = this.createClusterClient('data', config);

    const esNodesCompatibility$ = pollEsNodesVersion({
      internalClient: this.client.asInternalUser,
      log: this.log,
      ignoreVersionMismatch: config.ignoreVersionMismatch,
      esVersionCheckInterval: config.healthCheckDelay.asMilliseconds(),
      kibanaVersion: this.kibanaVersion,
    }).pipe(takeUntil(this.stop$), shareReplay({ refCount: true, bufferSize: 1 }));

    this.createLegacyCustomClient = (type, clientConfig = {}) => {
      const finalConfig = merge({}, config, clientConfig);
      return this.createLegacyClusterClient(type, finalConfig);
    };

    return {
      legacy: {
        config$: this.config$,
        client: this.legacyClient,
        createClient: this.createLegacyCustomClient,
      },
      esNodesCompatibility$,
      status$: calculateStatus$(esNodesCompatibility$),
    };
  }
  public async start(): Promise<InternalElasticsearchServiceStart> {
    if (!this.legacyClient || !this.createLegacyCustomClient) {
      throw new Error('ElasticsearchService needs to be setup before calling start');
    }

    const config = await this.config$.pipe(first()).toPromise();
    return {
      client: this.client!,
      createClient: (type, clientConfig) => this.createClusterClient(type, config, clientConfig),
      legacy: {
        config$: this.config$,
        client: this.legacyClient,
        createClient: this.createLegacyCustomClient,
      },
    };
  }

  public async stop() {
    this.log.debug('Stopping elasticsearch service');
    this.stop$.next();
    if (this.client) {
      await this.client.close();
    }
    if (this.legacyClient) {
      this.legacyClient.close();
    }
  }

  private createClusterClient(
    type: string,
    baseConfig: ElasticsearchConfig,
    clientConfig?: Partial<ElasticsearchClientConfig>
  ) {
    const config = clientConfig ? merge({}, baseConfig, clientConfig) : baseConfig;
    return new ClusterClient(
      config,
      this.coreContext.logger.get('elasticsearch'),
      type,
      this.getAuthHeaders,
      () => this.executionContextClient?.get()
    );
  }

  private createLegacyClusterClient(type: string, config: LegacyElasticsearchClientConfig) {
    return new LegacyClusterClient(
      config,
      this.coreContext.logger.get('elasticsearch'),
      type,
      this.getAuthHeaders
    );
  }
}
