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
  getFieldMinMaxQuery,
  getFieldValuesQuery,
  getHasDocumentsQuery,
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
  const fromOf = (title: string) => getHasDocumentsQuery(source(title)).replace(' | LIMIT 1', '');

  it('starts from the sources of the source, quoted when they need it', () => {
    expect(fromOf('logs-*,my index')).toBe('FROM logs-*, "my index"');
  });

  it('escapes a field name that is not a plain identifier', () => {
    expect(getFieldValuesQuery(source('logs-*'), 'host.name')).toBe(
      'FROM logs-* | STATS BY `host.name`'
    );
    expect(getFieldMinMaxQuery(source('logs-*'), 'bytes-in')).toBe(
      'FROM logs-* | STATS min = MIN(`bytes-in`), max = MAX(`bytes-in`)'
    );
  });
});
