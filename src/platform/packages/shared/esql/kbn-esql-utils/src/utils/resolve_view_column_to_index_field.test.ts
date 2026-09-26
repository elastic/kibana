/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsqlView } from '@kbn/esql-types';
import { resolveViewColumnToIndexField } from './resolve_view_column_to_index_field';

const views: EsqlView[] = [
  {
    name: 'meow',
    query: 'FROM kibana_sample_data_logs | STATS count = COUNT(*) BY geo.dest',
  },
  {
    name: 'woof',
    query: 'FROM kibana_sample_data_logs | EVAL foo = geo.dest',
  },
  {
    name: 'bark',
    query: 'FROM kibana_sample_data_logs | EVAL foo = CONCAT(geo.dest, "x")',
  },
  {
    name: 'aliased',
    query: 'FROM kibana_sample_data_logs | STATS count = COUNT(*) BY region = geo.dest',
  },
  {
    name: 'nested',
    query: 'FROM woof | RENAME foo AS bar',
  },
  {
    name: 'loop',
    query: 'FROM loop',
  },
  {
    name: 'bucketed',
    query:
      'FROM kibana_sample_data_logs | STATS count = COUNT(*) BY bucket = BUCKET(@timestamp, 1 hour)',
  },
  {
    name: 'subquery',
    query: 'FROM (FROM kibana_sample_data_logs | STATS count = COUNT(*) BY geo.dest)',
  },
];

describe('resolveViewColumnToIndexField', () => {
  it('maps a STATS grouping field to itself and rejects the aggregate', () => {
    expect(resolveViewColumnToIndexField('geo.dest', 'meow', views)).toBe('geo.dest');
    expect(resolveViewColumnToIndexField('count', 'meow', views)).toBeUndefined();
  });

  it('maps a pass-through field and a bare EVAL alias to the source field', () => {
    expect(resolveViewColumnToIndexField('geo.dest', 'woof', views)).toBe('geo.dest');
    expect(resolveViewColumnToIndexField('foo', 'woof', views)).toBe('geo.dest');
  });

  it('rejects an EVAL expression', () => {
    expect(resolveViewColumnToIndexField('foo', 'bark', views)).toBeUndefined();
  });

  it('rejects a BUCKET grouping key and a FROM subquery', () => {
    expect(resolveViewColumnToIndexField('bucket', 'bucketed', views)).toBeUndefined();
    expect(resolveViewColumnToIndexField('geo.dest', 'subquery', views)).toBeUndefined();
  });

  it('maps STATS BY alias = field to the source field', () => {
    expect(resolveViewColumnToIndexField('region', 'aliased', views)).toBe('geo.dest');
    expect(resolveViewColumnToIndexField('count', 'aliased', views)).toBeUndefined();
  });

  it('walks a nested view rename back to the index field', () => {
    expect(resolveViewColumnToIndexField('bar', 'nested', views)).toBe('geo.dest');
  });

  it('returns undefined for an index pattern, a cycle, and a rename mixed with an index', () => {
    expect(
      resolveViewColumnToIndexField('geo.dest', 'kibana_sample_data_logs', views)
    ).toBeUndefined();
    expect(resolveViewColumnToIndexField('geo.dest', 'loop', views)).toBeUndefined();
    expect(
      resolveViewColumnToIndexField('foo', 'woof,kibana_sample_data_logs', views)
    ).toBeUndefined();
  });

  it('keeps a shared field name when a view is combined with an index', () => {
    expect(resolveViewColumnToIndexField('geo.dest', 'woof,kibana_sample_data_logs', views)).toBe(
      'geo.dest'
    );
  });
});
