/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  Client as TraditionalClient,
  HttpConnection,
  ClusterConnectionPool,
} from '@elastic/elasticsearch';
import { Client as ServerlessClient } from '@elastic/elasticsearch-serverless';
import type { ElasticsearchClientConfig } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import type { AgentFactoryProvider } from './agent_manager';
import { parseClientOptions } from './client_config';
import { instrumentEsQueryAndDeprecationLogger } from './log_query_and_deprecation';
import { createTransport } from './create_transport';
import { patchElasticsearchClient } from './patch_client';

const noop = () => undefined;

// Apply ES client patches on module load
patchElasticsearchClient();

/**
 * @private
 */
export type ElasticsearchClientFlavor = 'traditional' | 'serverless';

/**
 * @private
 */
export interface ConfigureClientOptions {
  logger: Logger;
  type: string;
  scoped?: boolean;
  getExecutionContext?: () => string | undefined;
  agentFactoryProvider: AgentFactoryProvider;
  kibanaVersion: string;
  flavor: ElasticsearchClientFlavor;
}

export function configureClient(
  config: ElasticsearchClientConfig,
  options: ConfigureClientOptions & { flavor: 'serverless' }
): ServerlessClient;
export function configureClient(
  config: ElasticsearchClientConfig,
  options: ConfigureClientOptions & { flavor: 'traditional' }
): TraditionalClient;
export function configureClient(
  config: ElasticsearchClientConfig,
  options: ConfigureClientOptions
): ServerlessClient | TraditionalClient;
export function configureClient(
  config: ElasticsearchClientConfig,
  {
    logger,
    type,
    scoped = false,
    getExecutionContext = noop,
    agentFactoryProvider,
    kibanaVersion,
    flavor,
  }: ConfigureClientOptions
): ServerlessClient | TraditionalClient {
  const clientOptions = parseClientOptions(config, scoped, kibanaVersion);
  const KibanaTransport = createTransport({ getExecutionContext });
  const ClientConstructor = flavor === 'serverless' ? ServerlessClient : TraditionalClient;
  const client = new ClientConstructor({
    ...clientOptions,
    agent: agentFactoryProvider.getAgentFactory(clientOptions.agent),
    Transport: KibanaTransport,
    Connection: HttpConnection,
    // using ClusterConnectionPool until https://github.com/elastic/elasticsearch-js/issues/1714 is addressed
    ConnectionPool: ClusterConnectionPool,
  });

  const { apisToRedactInLogs = [] } = config;
  instrumentEsQueryAndDeprecationLogger({ logger, client, type, apisToRedactInLogs });

  return client;
}
