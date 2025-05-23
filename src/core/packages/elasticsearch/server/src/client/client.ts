/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Client } from '@elastic/elasticsearch';

/**
 * List of all the methods that we need to annotate (for deprecation or tracking purposes, or adding remarks).
 * @public
 */
export interface ElasticsearchClientOverrides {
  /**
   * @deprecated
   */
  search: Client['search'];
}

/**
 * Client used to query the elasticsearch cluster.
 *
 * @public
 */
export type ElasticsearchClient = ElasticsearchClientOverrides &
  Omit<
    Client,
    | 'connectionPool'
    | 'serializer'
    | 'extend'
    | 'close'
    | 'diagnostic'
    | keyof ElasticsearchClientOverrides
  >;
