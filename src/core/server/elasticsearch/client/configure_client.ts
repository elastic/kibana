/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Client, HttpConnection } from '@elastic/elasticsearch';
import { Logger } from '../../logging';
import { parseClientOptions, ElasticsearchClientConfig } from './client_config';
import { instrumentEsQueryAndDeprecationLogger } from './log_query_and_deprecation';
import { createTransport } from './create_transport';

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

  const client = new Client({
    ...clientOptions,
    Transport: KibanaTransport,
    Connection: HttpConnection,
  });

  instrumentEsQueryAndDeprecationLogger({ logger, client, type });

  return client;
};
