/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { firstValueFrom, Observable, Subject } from 'rxjs';
import { map, shareReplay, takeUntil } from 'rxjs/operators';

import type { Logger } from '@kbn/logging';
import type { CoreContext, CoreService } from '@kbn/core-base-server-internal';
import type { AnalyticsServiceSetup } from '@kbn/core-analytics-server';
import type {
  InternalExecutionContextSetup,
  IExecutionContext,
} from '@kbn/core-execution-context-server-internal';
import type { IAuthHeadersStorage } from '@kbn/core-http-server';
import type { InternalHttpServiceSetup } from '@kbn/core-http-server-internal';
import type {
  UnauthorizedErrorHandler,
  ElasticsearchClientConfig,
} from '@kbn/core-elasticsearch-server';
import { ClusterClient, AgentManager } from '@kbn/core-elasticsearch-client-server-internal';

import { registerAnalyticsContextProvider } from './register_analytics_context_provider';
import { ElasticsearchConfig, ElasticsearchConfigType } from './elasticsearch_config';
import {
  InternalElasticsearchServicePreboot,
  InternalElasticsearchServiceSetup,
  InternalElasticsearchServiceStart,
} from './types';
import type { NodesVersionCompatibility } from './version_check/ensure_es_version';
import { pollEsNodesVersion } from './version_check/ensure_es_version';
import { calculateStatus$ } from './status';
import { isValidConnection } from './is_valid_connection';
import { isInlineScriptingEnabled } from './is_scripting_enabled';
import { mergeConfig } from './merge_config';
import { getClusterInfo$ } from './get_cluster_info';

export interface SetupDeps {
  analytics: AnalyticsServiceSetup;
  http: InternalHttpServiceSetup;
  executionContext: InternalExecutionContextSetup;
}

/** @internal */
export class ElasticsearchService
  implements CoreService<InternalElasticsearchServiceSetup, InternalElasticsearchServiceStart>
{
  private readonly log: Logger;
  private readonly config$: Observable<ElasticsearchConfig>;
  private stop$ = new Subject<void>();
  private kibanaVersion: string;
  private authHeaders?: IAuthHeadersStorage;
  private executionContextClient?: IExecutionContext;
  private esNodesCompatibility$?: Observable<NodesVersionCompatibility>;
  private client?: ClusterClient;
  private unauthorizedErrorHandler?: UnauthorizedErrorHandler;
  private agentManager: AgentManager;

  constructor(private readonly coreContext: CoreContext) {
    this.kibanaVersion = coreContext.env.packageInfo.version;
    this.log = coreContext.logger.get('elasticsearch-service');
    this.config$ = coreContext.configService
      .atPath<ElasticsearchConfigType>('elasticsearch')
      .pipe(map((rawConfig) => new ElasticsearchConfig(rawConfig)));
    this.agentManager = new AgentManager();
  }

  public async preboot(): Promise<InternalElasticsearchServicePreboot> {
    this.log.debug('Prebooting elasticsearch service');

    const config = await firstValueFrom(this.config$);
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

    const config = await firstValueFrom(this.config$);

    this.authHeaders = deps.http.authRequestHeaders;
    this.executionContextClient = deps.executionContext;
    this.client = this.createClusterClient('data', config);

    const esNodesCompatibility$ = pollEsNodesVersion({
      internalClient: this.client.asInternalUser,
      log: this.log,
      ignoreVersionMismatch: config.ignoreVersionMismatch,
      esVersionCheckInterval: config.healthCheckDelay.asMilliseconds(),
      kibanaVersion: this.kibanaVersion,
    }).pipe(takeUntil(this.stop$), shareReplay({ refCount: true, bufferSize: 1 }));

    this.esNodesCompatibility$ = esNodesCompatibility$;

    const clusterInfo$ = getClusterInfo$(this.client.asInternalUser);
    registerAnalyticsContextProvider(deps.analytics, clusterInfo$);

    return {
      legacy: {
        config$: this.config$,
      },
      clusterInfo$,
      esNodesCompatibility$,
      status$: calculateStatus$(esNodesCompatibility$),
      setUnauthorizedErrorHandler: (handler) => {
        if (this.unauthorizedErrorHandler) {
          throw new Error('setUnauthorizedErrorHandler can only be called once.');
        }
        this.unauthorizedErrorHandler = handler;
      },
      agentStore: this.agentManager,
    };
  }

  public async start(): Promise<InternalElasticsearchServiceStart> {
    if (!this.client || !this.esNodesCompatibility$) {
      throw new Error('ElasticsearchService needs to be setup before calling start');
    }

    const config = await firstValueFrom(this.config$);

    // Log every error we may encounter in the connection to Elasticsearch
    this.esNodesCompatibility$.subscribe(({ isCompatible, message }) => {
      if (!isCompatible && message) {
        this.log.error(message);
      }
    });

    if (!config.skipStartupConnectionCheck) {
      // Ensure that the connection is established and the product is valid before moving on
      await isValidConnection(this.esNodesCompatibility$);

      // Ensure inline scripting is enabled on the ES cluster
      const scriptingEnabled = await isInlineScriptingEnabled({
        client: this.client.asInternalUser,
      });
      if (!scriptingEnabled) {
        throw new Error(
          'Inline scripting is disabled on the Elasticsearch cluster, and is mandatory for Kibana to function. ' +
            'Please enabled inline scripting, then restart Kibana. ' +
            'Refer to https://www.elastic.co/guide/en/elasticsearch/reference/master/modules-scripting-security.html for more info.'
        );
      }
    }

    return {
      client: this.client!,
      createClient: (type, clientConfig) => this.createClusterClient(type, config, clientConfig),
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
    baseConfig: ElasticsearchClientConfig,
    clientConfig: Partial<ElasticsearchClientConfig> = {}
  ) {
    const config = mergeConfig(baseConfig, clientConfig);

    return new ClusterClient({
      config,
      logger: this.coreContext.logger.get('elasticsearch'),
      type,
      authHeaders: this.authHeaders,
      getExecutionContext: () => this.executionContextClient?.getAsHeader(),
      getUnauthorizedErrorHandler: () => this.unauthorizedErrorHandler,
      agentFactoryProvider: this.agentManager,
      kibanaVersion: this.kibanaVersion,
    });
  }
}
