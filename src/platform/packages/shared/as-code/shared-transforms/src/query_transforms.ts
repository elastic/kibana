/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AsCodeQuery } from '@kbn/as-code-shared-schemas';
import type { Query } from '@kbn/es-query';

export function toAsCodeQuery(storedQuery: Query | undefined): AsCodeQuery | undefined {
  if (!storedQuery) return;
  if (typeof storedQuery.query !== 'string') return;

  return {
    expression: storedQuery.query,
    language: storedQuery.language === 'lucene' ? 'lucene' : 'kql',
  };
}

export function toStoredQuery(asCodeQuery: AsCodeQuery | undefined): Query | undefined {
  if (!asCodeQuery) return;
  return {
    query: asCodeQuery.expression,
    language: asCodeQuery.language === 'lucene' ? 'lucene' : 'kuery',
  };
}
