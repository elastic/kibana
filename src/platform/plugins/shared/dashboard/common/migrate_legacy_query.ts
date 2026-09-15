/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { has } from 'lodash';
import type { Query } from '@kbn/es-query';

/**
 * Migrates legacy query formats to the current stored {@link Query} format.
 * Queries without a `language` property are assumed to be Lucene queries,
 * since Lucene was the only option in earlier versions.
 *
 * @param query - The query to migrate, which can be a {@link Query}, a legacy object, or a string.
 * @returns The migrated {@link Query}.
 */
export function migrateLegacyQuery(query: Query | { [key: string]: any } | string): Query {
  // Lucene was the only option before, so language-less queries are all lucene
  if (!has(query, 'language')) {
    return { query, language: 'lucene' };
  }

  return query as Query;
}
