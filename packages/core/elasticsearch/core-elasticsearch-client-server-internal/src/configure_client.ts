/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Client, HttpConnection, ClusterConnectionPool } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/logging';
import type { ElasticsearchClientConfig } from '@kbn/core-elasticsearch-server';
import { parseClientOptions } from './client_config';
import { instrumentEsQueryAndDeprecationLogger } from './log_query_and_deprecation';
import { createTransport } from './create_transport';
import type { AgentFactoryProvider } from './agent_manager';
import { patchElasticsearchClient } from './patch_client';

const noop = () => undefined;

// Apply ES client patches on module load
patchElasticsearchClient();

export const configureClient = (
  config: ElasticsearchClientConfig,
  {
    logger,
    type,
    scoped = false,
    getExecutionContext = noop,
    agentFactoryProvider,
    kibanaVersion,
  }: {
    logger: Logger;
    type: string;
    scoped?: boolean;
    getExecutionContext?: () => string | undefined;
    agentFactoryProvider: AgentFactoryProvider;
    kibanaVersion: string;
  }
): Client => {
  const clientOptions = parseClientOptions(config, scoped, kibanaVersion);
  const KibanaTransport = createTransport({ getExecutionContext });
  const client = new Client({
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
};
