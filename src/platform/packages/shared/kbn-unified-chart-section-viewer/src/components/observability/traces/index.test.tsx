/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render } from '@testing-library/react';
import { EsqlSource } from '@kbn/data-source';
import type { UnifiedMetricsGridProps } from '../../../types';
import { TraceMetricsProvider } from './context/trace_metrics_context';
import TraceMetricsGrid from '.';

jest.mock('./context/trace_metrics_context', () => ({
  TraceMetricsProvider: jest.fn(({ children }) => <>{children}</>),
}));
jest.mock('./latency', () => ({ LatencyChart: () => null }));
jest.mock('./error_rate', () => ({ ErrorRateChart: () => null }));
jest.mock('./throughput', () => ({ ThroughputChart: () => null }));
jest.mock('../../charts_grid', () => ({
  ChartsGrid: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('@kbn/unified-histogram', () => ({ UnifiedBreakdownFieldSelector: () => null }));

describe('TraceMetricsGrid', () => {
  it('passes the remote cluster prefixes of the ES|QL sources to the charts', async () => {
    const query =
      'FROM remote_cluster:apm-*, remote_cluster:traces-apm*, apm-*, traces-apm* | WHERE `trace.id` == "abc"';
    const dataSource = await EsqlSource.create({ query, resultColumns: [] });

    render(
      <TraceMetricsGrid
        {...({
          fetchParams: { query: { esql: query }, dataSource, columns: [] },
          services: {},
          renderToggleActions: () => null,
        } as unknown as UnifiedMetricsGridProps)}
      />
    );

    expect(jest.mocked(TraceMetricsProvider).mock.lastCall?.[0].value?.indexes).toBe(
      'remote_cluster:apm-*,remote_cluster:traces-apm*,apm-*,traces-apm*'
    );
  });
});
