/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Query } from '@kbn/es-query';
import type { TypeOf } from '@kbn/config-schema';
import type { asCodeQuerySchema } from '@kbn/as-code-shared-schemas';

type DashboardQuery = TypeOf<typeof asCodeQuerySchema>;

export const toStoredQuery = (asCodeQuery: DashboardQuery | undefined): Query | undefined => {
  if (!asCodeQuery) return;
  return {
    query: asCodeQuery.expression,
    language: asCodeQuery.language === 'lucene' ? 'lucene' : 'kuery',
  };
};

export const toAsCodeQuery = (storedQuery: Query | undefined): DashboardQuery | undefined => {
  if (!storedQuery) return;
  if (typeof storedQuery.query !== 'string') return;

  return {
    expression: storedQuery.query,
    language: storedQuery.language === 'lucene' ? 'lucene' : 'kql',
  };
};
