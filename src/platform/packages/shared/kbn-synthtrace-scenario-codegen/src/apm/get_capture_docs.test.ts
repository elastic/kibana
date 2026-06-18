/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getApmCaptureDocs } from './get_capture_docs';
import type { ApmCaptureSearchFn, ApmCaptureSearchRequest } from './get_capture_docs';

interface RecordedCall {
  operationName: string;
  params: ApmCaptureSearchRequest;
}

interface BoolFilterQuery {
  bool?: { filter?: Array<{ terms?: Record<string, unknown> }> };
}

/**
 * Returns true if any filter clause in the query is a `terms` query on `host.name` matching
 * exactly the given host names.
 */
const hasHostNamesTermsFilter = (
  params: ApmCaptureSearchRequest,
  hostNames: string[]
): boolean => {
  const query = params.query as BoolFilterQuery | undefined;
  const filter = query?.bool?.filter ?? [];
  return filter.some((clause) => {
    const terms = clause.terms?.['host.name'];
    return terms !== undefined && JSON.stringify(terms) === JSON.stringify(hostNames);
  });
};

const createRecordingSearch = () => {
  const calls: RecordedCall[] = [];
  const search: ApmCaptureSearchFn = async (operationName, params) => {
    calls.push({ operationName, params });

    if (operationName === 'get_trace_ids_for_synthtrace_capture') {
      return {
        hits: { hits: [] },
        aggregations: {
          sample: {
            services: {
              buckets: [{ traces: { buckets: [{ key: 'trace-1' }] } }],
            },
          },
        },
      };
    }

    if (operationName === 'get_docs_for_synthtrace_capture') {
      // One short page so the pager stops immediately.
      return {
        hits: {
          hits: [
            {
              _source: {
                '@timestamp': '2024-01-01T00:00:00.000Z',
                processor: { event: 'transaction' },
                trace: { id: 'trace-1' },
                transaction: { id: 'tx-1', name: 'GET /api', type: 'request', duration: { us: 1000 } },
                service: { name: 'svc', environment: 'prod', node: { name: 'n-1' } },
                host: { name: 'host-1' },
                agent: { name: 'go' },
                event: { outcome: 'success' },
              },
              sort: [1],
            },
          ],
        },
      };
    }

    // get_metrics_for_synthtrace_capture: no app metrics.
    return { hits: { hits: [] } };
  };

  return { search, calls };
};

const baseArgs = {
  start: 0,
  end: 1000,
  environment: 'ENVIRONMENT_ALL',
  kuery: '',
  maxServices: 100,
  tracesPerService: 100,
  maxDocs: 10,
  maxMetricDocs: 10,
};

describe('getApmCaptureDocs', () => {
  it('scopes the discovery and metric queries to the given host names', async () => {
    const { search, calls } = createRecordingSearch();
    const hostNames = ['host-1', 'host-2'];

    await getApmCaptureDocs({ ...baseArgs, search, hostNames });

    const discovery = calls.find(
      (c) => c.operationName === 'get_trace_ids_for_synthtrace_capture'
    );
    const metrics = calls.find((c) => c.operationName === 'get_metrics_for_synthtrace_capture');

    expect(discovery).toBeDefined();
    expect(metrics).toBeDefined();
    expect(hasHostNamesTermsFilter(discovery!.params, hostNames)).toBe(true);
    expect(hasHostNamesTermsFilter(metrics!.params, hostNames)).toBe(true);
  });

  it('forces two-phase trace-id discovery when host names are given, even without a kuery', async () => {
    const { search, calls } = createRecordingSearch();

    await getApmCaptureDocs({ ...baseArgs, search, hostNames: ['host-1'] });

    expect(
      calls.some((c) => c.operationName === 'get_trace_ids_for_synthtrace_capture')
    ).toBe(true);
  });

  it('skips trace-id discovery for a broad capture (no filters, no host names)', async () => {
    const { search, calls } = createRecordingSearch();

    await getApmCaptureDocs({ ...baseArgs, search });

    expect(
      calls.some((c) => c.operationName === 'get_trace_ids_for_synthtrace_capture')
    ).toBe(false);
    expect(calls.some((c) => c.operationName === 'get_docs_for_synthtrace_capture')).toBe(true);
  });
});
