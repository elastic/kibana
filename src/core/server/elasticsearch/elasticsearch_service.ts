/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Observable, Subject } from 'rxjs';
import { first, map, shareReplay, takeUntil } from 'rxjs/operators';

import { CoreService } from '../../types';
import { CoreContext } from '../core_context';
import { Logger } from '../logging';

import { ClusterClient, ElasticsearchClientConfig } from './client';
import { ElasticsearchConfig, ElasticsearchConfigType } from './elasticsearch_config';
import type { InternalHttpServiceSetup, GetAuthHeaders } from '../http';
import type { InternalExecutionContextSetup, IExecutionContext } from '../execution_context';
import type { InternalDeprecationsServiceSetup } from '../deprecations';
import {
  InternalElasticsearchServicePreboot,
  InternalElasticsearchServiceSetup,
  InternalElasticsearchServiceStart,
} from './types';
import type { NodesVersionCompatibility } from './version_check/ensure_es_version';
import { pollEsNodesVersion } from './version_check/ensure_es_version';
import { calculateStatus$ } from './status';
import { isValidConnection } from './is_valid_connection';
import { getElasticsearchDeprecationsProvider } from './deprecations';
import { mergeConfig } from './merge_config';

export interface SetupDeps {
  http: InternalHttpServiceSetup;
  deprecations: InternalDeprecationsServiceSetup;
  executionContext: InternalExecutionContextSetup;
}

/** @internal */
export class ElasticsearchService
  implements CoreService<InternalElasticsearchServiceSetup, InternalElasticsearchServiceStart>
{
  private readonly log: Logger;
  private readonly config$: Observable<ElasticsearchConfig>;
  private stop$ = new Subject();
  private kibanaVersion: string;
  private getAuthHeaders?: GetAuthHeaders;
  private executionContextClient?: IExecutionContext;
  private esNodesCompatibility$?: Observable<NodesVersionCompatibility>;
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

    deps.deprecations
      .getRegistry('elasticsearch')
      .registerDeprecations(getElasticsearchDeprecationsProvider());

    const esNodesCompatibility$ = pollEsNodesVersion({
      internalClient: this.client.asInternalUser,
      log: this.log,
      ignoreVersionMismatch: config.ignoreVersionMismatch,
      esVersionCheckInterval: config.healthCheckDelay.asMilliseconds(),
      kibanaVersion: this.kibanaVersion,
    }).pipe(takeUntil(this.stop$), shareReplay({ refCount: true, bufferSize: 1 }));

    this.esNodesCompatibility$ = esNodesCompatibility$;

    return {
      legacy: {
        config$: this.config$,
      },
      esNodesCompatibility$,
      status$: calculateStatus$(esNodesCompatibility$),
    };
  }

  public async start(): Promise<InternalElasticsearchServiceStart> {
    if (!this.client || !this.esNodesCompatibility$) {
      throw new Error('ElasticsearchService needs to be setup before calling start');
    }

    const config = await this.config$.pipe(first()).toPromise();

    // Log every error we may encounter in the connection to Elasticsearch
    this.esNodesCompatibility$.subscribe(({ isCompatible, message }) => {
      if (!isCompatible && message) {
        this.log.error(message);
      }
    });

    if (!config.skipStartupConnectionCheck) {
      // Ensure that the connection is established and the product is valid before moving on
      await isValidConnection(this.esNodesCompatibility$);
    }

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
    baseConfig: ElasticsearchClientConfig,
    clientConfig: Partial<ElasticsearchClientConfig> = {}
  ) {
    const config = mergeConfig(baseConfig, clientConfig);
    return new ClusterClient(
      config,
      this.coreContext.logger.get('elasticsearch'),
      type,
      this.getAuthHeaders,
      () => this.executionContextClient?.getAsHeader()
    );
  }
}
