/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// Copied from src/core/server/elasticsearch/client/types.ts
// as these types aren't part of any package yet. Once they are, remove this completely

import type { Client } from '@elastic/elasticsearch';

/**
 * Client used to query the elasticsearch cluster.
 * @deprecated At some point use the one from src/core/server/elasticsearch/client/types.ts when it is made into a package. If it never is, then keep using this one.
 * @public
 */
export type ElasticsearchClient = Omit<
  Client,
  'connectionPool' | 'serializer' | 'extend' | 'child' | 'close' | 'diagnostic'
>;
