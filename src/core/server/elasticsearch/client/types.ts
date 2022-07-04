/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Client } from '@elastic/elasticsearch';

/**
 * Client used to query the elasticsearch cluster.
 *
 * @public
 */
export type ElasticsearchClient = Omit<
  Client,
  'connectionPool' | 'serializer' | 'extend' | 'close' | 'diagnostic'
>;

/**
 * All response typings are maintained until elasticsearch-js provides them out of the box
 * https://github.com/elastic/elasticsearch-js/pull/970
 */

/**
 * @public
 */
export interface ShardsResponse {
  total: number;
  successful: number;
  failed: number;
  skipped: number;
}

/**
 * @public
 */
export interface Explanation {
  value: number;
  description: string;
  details: Explanation[];
}
