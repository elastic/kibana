/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import type { Error, TraceItem } from '@kbn/apm-types';
import { useTraceWaterfall } from './use_trace_waterfall';

const rootItem: TraceItem = {
  id: 'span-1',
  name: 'GET /api',
  timestampUs: 1_000_000,
  traceId: 'trace-1',
  duration: 1_000,
  errors: [],
  serviceName: 'my-service',
  spanLinksCount: { incoming: 0, outgoing: 0 },
  docType: 'transaction',
};

function buildError(overrides: Partial<Error>): Error {
  return {
    id: 'error-doc-1',
    trace: { id: 'trace-1' },
    parent: { id: 'span-1' },
    service: { name: 'my-service' },
    timestamp: { us: 1_000_100 },
    error: { grouping_key: 'group-1' },
    ...overrides,
  };
}

describe('useTraceWaterfall error marks', () => {
  it('forwards both transaction.id and span.id to getErrorMarkerHref', () => {
    const getErrorMarkerHref = jest.fn().mockReturnValue('/href');

    renderHook(() =>
      useTraceWaterfall({
        traceItems: [rootItem],
        errors: [buildError({ transaction: { id: 'tx-1' }, span: { id: 'span-1' } })],
        getErrorMarkerHref,
      })
    );

    expect(getErrorMarkerHref).toHaveBeenCalledWith({
      serviceName: 'my-service',
      errorGroupId: 'group-1',
      traceId: 'trace-1',
      transactionId: 'tx-1',
      spanId: 'span-1',
    });
  });

  // OTel-native error documents only carry `span.id`.
  it('forwards span.id with an undefined transactionId for OTel errors', () => {
    const getErrorMarkerHref = jest.fn().mockReturnValue('/href');

    renderHook(() =>
      useTraceWaterfall({
        traceItems: [rootItem],
        errors: [buildError({ span: { id: 'span-1' } })],
        getErrorMarkerHref,
      })
    );

    expect(getErrorMarkerHref).toHaveBeenCalledWith(
      expect.objectContaining({ transactionId: undefined, spanId: 'span-1' })
    );
  });

  it('does not build an errorMarkerHref when the error has no grouping key', () => {
    const getErrorMarkerHref = jest.fn().mockReturnValue('/href');

    const { result } = renderHook(() =>
      useTraceWaterfall({
        traceItems: [rootItem],
        errors: [buildError({ span: { id: 'span-1' }, error: {} })],
        getErrorMarkerHref,
      })
    );

    expect(getErrorMarkerHref).not.toHaveBeenCalled();
    expect(result.current.errorMarks[0].errorMarkerHref).toBeUndefined();
  });
});
