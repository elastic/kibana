/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AggregateQuery, Query } from '@kbn/es-query';
import { isOfAggregateQueryType } from '@kbn/es-query';

export function getQueryLanguage(query: Query | AggregateQuery | undefined) {
  if (!query) return '';
  if (isOfAggregateQueryType(query)) return 'esql';
  return query.language;
}

export function getQueryString(query: Query | AggregateQuery | undefined) {
  if (!query) return '';
  if (isOfAggregateQueryType(query)) return query.esql;
  if (typeof query.query === 'string') return query.query;
  return Object.values(query.query).join('');
}

export function getQueryStringCharCount(queryString: string) {
  return queryString.replace(/\n/g, '').length;
}

export function getQueryStringLineCount(queryString: string) {
  return queryString.split('\n').length;
}
