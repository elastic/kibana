/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Client as TraditionalClient } from '@elastic/elasticsearch';
import { Client as ServerlessClient } from '@elastic/elasticsearch-serverless';

/**
 * Client used to query elasticsearch.
 *
 * @public
 */
export type ElasticsearchClient = ElasticsearchServerlessClient | ElasticsearchTraditionalClient;

/**
 * Client used to query the elasticsearch cluster.
 *
 * @public
 */
export type ElasticsearchTraditionalClient = Omit<
  TraditionalClient,
  'connectionPool' | 'serializer' | 'extend' | 'close' | 'diagnostic'
>;

/**
 * Client used to query the elasticsearch serverless service.
 *
 * @public
 */
export type ElasticsearchServerlessClient = Omit<
  ServerlessClient,
  'connectionPool' | 'serializer' | 'extend' | 'close' | 'diagnostic'
>;

/**
 * Does the client support the Serverless-specific features
 * @param client The {@link ElasticsearchClient | client}
 *
 * @public
 */
export function isElasticsearchServerlessClient(
  client: ElasticsearchClient
): client is ElasticsearchServerlessClient {
  // ideally, we'll have some property to check in the future: https://github.com/elastic/elasticsearch-serverless-js/issues/74
  return client instanceof ServerlessClient;
}

/**
 * Does the client support the Traditional-specific features
 * @param client The {@link ElasticsearchClient | client}
 *
 * @public
 */
export function isElasticsearchTraditionalClient(
  client: ElasticsearchClient
): client is ElasticsearchTraditionalClient {
  // ideally, we'll have some property to check in the future: https://github.com/elastic/elasticsearch-serverless-js/issues/74
  return client instanceof TraditionalClient;
}
