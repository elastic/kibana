/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FilterableSource } from '@kbn/data-source';
import {
  getAnyDocumentQuery,
  getFieldMinMaxQuery,
  getFieldValuesQuery,
} from './esql_source_queries';

describe('queries on the FROM target of an ES|QL source', () => {
  const source = (title: string): FilterableSource => ({
    kind: 'esql',
    id: 'dataset-id',
    title,
    fields: [],
    getFieldByName: () => undefined,
    isTimeBased: () => false,
  });

  it('reads the values of a field from the target, which can be a list of targets', () => {
    expect(getFieldValuesQuery(source('logs-*,metrics-*'), 'host')).toBe(
      'FROM logs-*,metrics-* | STATS BY host'
    );
  });

  it('escapes a field name that is not a plain identifier', () => {
    expect(getFieldValuesQuery(source('logs-*'), 'host.name')).toBe(
      'FROM logs-* | STATS BY `host.name`'
    );
    expect(getFieldMinMaxQuery(source('logs-*'), 'bytes-in')).toBe(
      'FROM logs-* | STATS min = MIN(`bytes-in`), max = MAX(`bytes-in`)'
    );
  });

  it('reads one document of the target', () => {
    expect(getAnyDocumentQuery(source('my-view'))).toBe('FROM my-view | LIMIT 1');
  });
});
