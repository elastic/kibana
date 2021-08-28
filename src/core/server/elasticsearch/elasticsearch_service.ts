/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { Logger } from '@kbn/logging';
import { merge } from '@kbn/std';
import { Observable, Subject } from 'rxjs';
import { first, map, shareReplay, takeUntil } from 'rxjs/operators';
import type { CoreService } from '../../types/core_service';
import type { CoreContext } from '../core_context';
import type {
  IExecutionContext,
  InternalExecutionContextSetup,
} from '../execution_context/execution_context_service';
import type { GetAuthHeaders } from '../http/auth_headers_storage';
import type { InternalHttpServiceSetup } from '../http/types';
import type { ElasticsearchClientConfig } from './client/client_config';
import { ClusterClient } from './client/cluster_client';
import type { ElasticsearchConfigType } from './elasticsearch_config';
import { ElasticsearchConfig } from './elasticsearch_config';
import { calculateStatus$ } from './status';
import type {
  InternalElasticsearchServicePreboot,
  InternalElasticsearchServiceSetup,
  InternalElasticsearchServiceStart,
} from './types';
import { pollEsNodesVersion } from './version_check/ensure_es_version';

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
    this.client = this.createClusterClient('data', config);

    const esNodesCompatibility$ = pollEsNodesVersion({
      internalClient: this.client.asInternalUser,
      log: this.log,
      ignoreVersionMismatch: config.ignoreVersionMismatch,
      esVersionCheckInterval: config.healthCheckDelay.asMilliseconds(),
      kibanaVersion: this.kibanaVersion,
    }).pipe(takeUntil(this.stop$), shareReplay({ refCount: true, bufferSize: 1 }));

    return {
      legacy: {
        config$: this.config$,
      },
      esNodesCompatibility$,
      status$: calculateStatus$(esNodesCompatibility$),
    };
  }
  public async start(): Promise<InternalElasticsearchServiceStart> {
    if (!this.client) {
      throw new Error('ElasticsearchService needs to be setup before calling start');
    }

    const config = await this.config$.pipe(first()).toPromise();
    return {
      client: this.client!,
      createClient: (type, clientConfig) => this.createClusterClient(type, config, clientConfig),
      legacy: {
        config$: this.config$,
      },
    };
  }

  public async stop() {
    this.log.debug('Stopping elasticsearch service');
    this.stop$.next();
    if (this.client) {
      await this.client.close();
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
      () => this.executionContextClient?.getAsHeader()
    );
  }
}
