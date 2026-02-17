/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import { map, takeUntil, firstValueFrom, Subject } from 'rxjs';

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
  ElasticsearchCapabilities,
} from '@kbn/core-elasticsearch-server';
import { ClusterClient, AgentManager } from '@kbn/core-elasticsearch-client-server-internal';

import type { InternalSecurityServiceSetup } from '@kbn/core-security-server-internal';
import { registerAnalyticsContextProvider } from './register_analytics_context_provider';
import type { ElasticsearchConfigType } from './elasticsearch_config';
import { ElasticsearchConfig } from './elasticsearch_config';
import type {
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
import { type ClusterInfo, getClusterInfo$ } from './get_cluster_info';
import { getElasticsearchCapabilities } from './get_capabilities';

export interface SetupDeps {
  analytics: AnalyticsServiceSetup;
  http: InternalHttpServiceSetup;
  executionContext: InternalExecutionContextSetup;
  security: InternalSecurityServiceSetup;
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
  private clusterInfo$?: Observable<ClusterInfo>;
  private unauthorizedErrorHandler?: UnauthorizedErrorHandler;
  private agentManager?: AgentManager;
  // @ts-expect-error - CPS is not yet implemented
  private cpsEnabled = false;
  private security?: InternalSecurityServiceSetup;

  constructor(private readonly coreContext: CoreContext) {
    this.kibanaVersion = coreContext.env.packageInfo.version;
    this.log = coreContext.logger.get('elasticsearch-service');
    this.config$ = coreContext.configService
      .atPath<ElasticsearchConfigType>('elasticsearch')
      .pipe(map((rawConfig) => new ElasticsearchConfig(rawConfig)));
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

    const agentManager = this.getAgentManager(config);

    this.authHeaders = deps.http.authRequestHeaders;
    this.executionContextClient = deps.executionContext;
    this.security = deps.security;
    this.client = this.createClusterClient('data', config);

    const esNodesCompatibility$ = pollEsNodesVersion({
      kibanaVersion: this.kibanaVersion,
      ignoreVersionMismatch: config.ignoreVersionMismatch,
      healthCheckInterval: config.healthCheckDelay.asMilliseconds(),
      healthCheckFailureInterval: config.healthCheckFailureInterval?.asMilliseconds(),
      healthCheckStartupInterval: config.healthCheckStartupDelay.asMilliseconds(),
      healthCheckRetry: config.healthCheckRetry,
      log: this.log,
      internalClient: this.client.asInternalUser,
    }).pipe(takeUntil(this.stop$));

    // Log every error we may encounter in the connection to Elasticsearch
    esNodesCompatibility$.subscribe(({ isCompatible, message }) => {
      if (!isCompatible && message) {
        this.log.error(message);
      }
    });

    this.esNodesCompatibility$ = esNodesCompatibility$;

    this.clusterInfo$ = getClusterInfo$(this.client.asInternalUser).pipe(takeUntil(this.stop$));
    registerAnalyticsContextProvider(deps.analytics, this.clusterInfo$);

    return {
      legacy: {
        config$: this.config$,
      },
      clusterInfo$: this.clusterInfo$,
      esNodesCompatibility$,
      status$: calculateStatus$(esNodesCompatibility$),
      setUnauthorizedErrorHandler: (handler) => {
        if (this.unauthorizedErrorHandler) {
          throw new Error('setUnauthorizedErrorHandler can only be called once.');
        }
        this.unauthorizedErrorHandler = handler;
      },
      agentStatsProvider: {
        getAgentsStats: agentManager.getAgentsStats.bind(agentManager),
      },
      publicBaseUrl: config.publicBaseUrl,
      setCpsFeatureFlag: (enabled) => {
        this.cpsEnabled = enabled;
        this.log.info(`CPS feature flag set to ${enabled}`);
      },
    };
  }

  public async start(): Promise<InternalElasticsearchServiceStart> {
    if (!this.client || !this.esNodesCompatibility$) {
      throw new Error('ElasticsearchService needs to be setup before calling start');
    }

    const config = await firstValueFrom(this.config$);

    let capabilities: ElasticsearchCapabilities;
    let elasticsearchWaitTime: number;

    if (!config.skipStartupConnectionCheck) {
      const elasticsearchWaitStartTime = performance.now();
      // Ensure that the connection is established and the product is valid before moving on
      await isValidConnection(this.esNodesCompatibility$);

      elasticsearchWaitTime = Math.round(performance.now() - elasticsearchWaitStartTime);
      this.log.info(
        `Successfully connected to Elasticsearch after waiting for ${elasticsearchWaitTime} milliseconds`,
        {
          event: {
            // ECS Event reference: https://www.elastic.co/docs/reference/ecs/ecs-event
            action: 'kibana_started.elasticsearch.waitTime',
            category: 'database',
            duration: elasticsearchWaitTime,
            type: 'connection',
          },
        }
      );

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

      capabilities = getElasticsearchCapabilities({
        clusterInfo: await firstValueFrom(this.clusterInfo$!),
      });
    } else {
      // skipStartupConnectionCheck is only used for unit testing, we default to base capabilities
      capabilities = {
        serverless: false,
      };
      elasticsearchWaitTime = 0;
    }

    return {
      client: {
        asInternalUser: this.client!.asInternalUser,
        asScoped: this.client!.asScoped.bind(this.client!),
      },
      createClient: (type, clientConfig) => this.createClusterClient(type, config, clientConfig),
      getCapabilities: () => capabilities,
      metrics: {
        elasticsearchWaitTime,
      },
      publicBaseUrl: config.publicBaseUrl,
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
      security: this.security,
      getExecutionContext: () => this.executionContextClient?.getAsHeader(),
      getUnauthorizedErrorHandler: () => this.unauthorizedErrorHandler,
      agentFactoryProvider: this.getAgentManager(baseConfig),
      kibanaVersion: this.kibanaVersion,
    });
  }

  private getAgentManager({ dnsCacheTtl }: ElasticsearchClientConfig): AgentManager {
    if (!this.agentManager) {
      this.agentManager = new AgentManager(this.log.get('agent-manager'), {
        dnsCacheTtlInSeconds: dnsCacheTtl?.asSeconds() ?? 0, // it should always exists, but some test shortcuts and mocks break this assumption
      });
    }
    return this.agentManager;
  }
}
