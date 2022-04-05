/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Client, HttpConnection } from '@elastic/elasticsearch';
import agent, { Span } from 'elastic-apm-node';
import LRUCache from 'lru-cache';
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

  const cache = new LRUCache<any, Span | undefined | null>({
    max: 100,
  });

  const client = new Client({
    ...clientOptions,
    Transport: KibanaTransport,
    Connection: HttpConnection,
  });

  function startSpan(name: string) {
    const span = agent.startSpan(name, 'db', 'elasticsearch', { exitSpan: true });
    return span;
  }

  client.diagnostic.on('serialization', (err, result) => {
    if (!err) {
      cache.set(result?.meta.request.id, startSpan('serialization'));
    }
  });

  client.diagnostic.on('request', (err, result) => {
    cache.get(result?.meta.request.id)?.end();
    if (!err) {
      cache.set(result?.meta.request.id, startSpan('request'));
    }
  });

  client.diagnostic.on('deserialization', (err, result) => {
    cache.get(result?.requestId)?.end();
    if (!err) {
      cache.set(result?.requestId, startSpan('deserialization'));
    }
  });

  client.diagnostic.on('response', (err, result) => {
    cache.get(result?.meta.request.id)?.end();
  });

  instrumentEsQueryAndDeprecationLogger({ logger, client, type });

  return client;
};
