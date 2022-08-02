/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  Client,
  HttpConnection,
  ClusterConnectionPool,
  HttpAgentOptions,
  UndiciAgentOptions,
} from '@elastic/elasticsearch';
import type { Logger } from '@kbn/logging';
import type { ElasticsearchClientConfig } from '@kbn/core-elasticsearch-server';
import { parseClientOptions } from './client_config';
import { instrumentEsQueryAndDeprecationLogger } from './log_query_and_deprecation';
import { createTransport } from './create_transport';
import { httpAgentFactory } from './http_agent_factory';

const noop = () => undefined;

export const configureClient = (
  config: ElasticsearchClientConfig,
  {
    logger,
    type,
    scoped = false,
    getExecutionContext = noop,
  }: {
    logger: Logger;
    type: string;
    scoped?: boolean;
    getExecutionContext?: () => string | undefined;
  }
): Client => {
  const clientOptions = parseClientOptions(config, scoped);
  const KibanaTransport = createTransport({ getExecutionContext });

  const agentOptions = clientOptions.agent || undefined;

  let agent;

  if (typeof agentOptions === 'function') {
    agent = agentOptions;
  } else if (!agentOptions || isHttpAgentOptions(agentOptions)) {
    agent = httpAgentFactory(type, agentOptions);
  } else {
    throw new Error('Unsupported agent options: UndiciAgentOptions');
  }

  const client = new Client({
    ...clientOptions,
    agent,
    Transport: KibanaTransport,
    Connection: HttpConnection,
    // using ClusterConnectionPool until https://github.com/elastic/elasticsearch-js/issues/1714 is addressed
    ConnectionPool: ClusterConnectionPool,
  });

  instrumentEsQueryAndDeprecationLogger({ logger, client, type });

  return client;
};

const isHttpAgentOptions = (
  opts: HttpAgentOptions | UndiciAgentOptions
): opts is HttpAgentOptions => {
  return (
    !('keepAliveTimeout' in opts) &&
    !('keepAliveMaxTimeout' in opts) &&
    !('keepAliveTimeoutThreshold' in opts) &&
    !('pipelining' in opts) &&
    !('maxHeaderSize' in opts) &&
    !('connections' in opts)
  );
};
