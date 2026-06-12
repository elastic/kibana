/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { useEsqlQueryInfo } from './use_esql_query_info';

describe('useEsqlQueryInfo', () => {
  it('extracts metric field, dimensions, and indices from a simple query', () => {
    const query = 'FROM metrics-* | STATS count(field) by dim1, dim2';

    const { result } = renderHook(() => useEsqlQueryInfo({ query }));

    expect(result.current.metricField).toBe('field');
    expect(result.current.columns).toEqual(['field']);
    expect(result.current.dimensions).toEqual(['dim1', 'dim2']);
    expect(result.current.indices).toEqual(['metrics-*']);
    expect(result.current.metadataFields).toEqual([]);
  });

  it('handles multiple metric fields in a stats query', () => {
    const query = 'FROM metrics-* | STATS count(metric1), sum(metric2) by dim1';

    const { result } = renderHook(() => useEsqlQueryInfo({ query }));

    expect(result.current.metricField).toBe('metric1');
    expect(result.current.columns).toEqual(['metric1', 'metric2']);
    expect(result.current.dimensions).toEqual(['dim1']);
    expect(result.current.indices).toEqual(['metrics-*']);
    expect(result.current.metadataFields).toEqual([]);
  });

  it('works with no dimensions', () => {
    const query = 'FROM metrics-* | STATS count(metric1)';

    const { result } = renderHook(() => useEsqlQueryInfo({ query }));

    expect(result.current.metricField).toBe('metric1');
    expect(result.current.columns).toEqual(['metric1']);
    expect(result.current.dimensions).toEqual([]);
    expect(result.current.indices).toEqual(['metrics-*']);
    expect(result.current.metadataFields).toEqual([]);
  });

  it('handles multiple indices', () => {
    const query = 'FROM metrics-*,custom-index-*';

    const { result } = renderHook(() => useEsqlQueryInfo({ query }));

    expect(result.current.indices).toEqual(['metrics-*', 'custom-index-*']);
    expect(result.current.metadataFields).toEqual([]);
  });

  it('extracts metadata fields requested via FROM ... METADATA ...', () => {
    const query =
      'FROM traces-* METADATA _id, _index | WHERE _id == "abc" AND _index == "traces-0001" | LIMIT 10';

    const { result } = renderHook(() => useEsqlQueryInfo({ query }));

    expect(result.current.filters).toEqual(['_id == "abc" AND _index == "traces-0001"']);
    expect(result.current.metadataFields.sort()).toEqual(['_id', '_index'].sort());
  });
});
