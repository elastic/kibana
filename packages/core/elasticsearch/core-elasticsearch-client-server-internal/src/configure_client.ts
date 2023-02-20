/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Client, HttpConnection, ClusterConnectionPool } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/logging';
import type { ElasticsearchClientConfig } from '@kbn/core-elasticsearch-server';
import { IExecutionContext } from '@kbn/core-execution-context-server-internal';
import { parseClientOptions } from './client_config';
import { instrumentEsQueryAndDeprecationLogger } from './log_query_and_deprecation';
import { createTransport } from './create_transport';
import type { AgentFactoryProvider } from './agent_manager';

const noop = () => undefined;

export const configureClient = (
  config: ElasticsearchClientConfig,
  {
    logger,
    type,
    scoped = false,
    executionContext,
    agentFactoryProvider,
    kibanaVersion,
  }: {
    logger: Logger;
    type: string;
    scoped?: boolean;
    executionContext: IExecutionContext | undefined;
    agentFactoryProvider: AgentFactoryProvider;
    kibanaVersion: string;
  }
): Client => {
  const clientOptions = parseClientOptions(config, scoped, kibanaVersion);
  const KibanaTransport = createTransport({ executionContext });
  const client = new Client({
    ...clientOptions,
    agent: agentFactoryProvider.getAgentFactory(clientOptions.agent),
    Transport: KibanaTransport,
    Connection: HttpConnection,
    // using ClusterConnectionPool until https://github.com/elastic/elasticsearch-js/issues/1714 is addressed
    ConnectionPool: ClusterConnectionPool,
  });

  instrumentEsQueryAndDeprecationLogger({ logger, client, type });

  return client;
};
