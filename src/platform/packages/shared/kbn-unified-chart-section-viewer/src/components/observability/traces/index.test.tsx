/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EsqlSource } from '@kbn/data-source';
import { selectionToEsqlCondition } from '@kbn/trace-latency-map';
import { FEATURE_FLAGS } from '../../../common/constants';
import { createFeatureFlagsMock } from '../../../test_utils/create_feature_flags_mock';
import type { UnifiedMetricsGridProps } from '../../../types';
import { TraceMetricsProvider } from './context/trace_metrics_context';
import { TracesLatencyMapView } from './latency_map_view';
import TraceMetricsGrid from '.';

jest.mock('./context/trace_metrics_context', () => ({
  TraceMetricsProvider: jest.fn(({ children }) => <>{children}</>),
}));
jest.mock('./latency', () => ({ LatencyChart: () => null }));
jest.mock('./error_rate', () => ({ ErrorRateChart: () => null }));
jest.mock('./throughput', () => ({ ThroughputChart: () => null }));
jest.mock('./latency_map_view', () => ({
  TracesLatencyMapView: jest.fn(() => null),
}));
jest.mock('../../charts_grid', () => ({
  ChartsGrid: ({
    children,
    toolbar,
  }: {
    children: React.ReactNode;
    toolbar: { leftSide: React.ReactNode };
  }) => (
    <>
      {toolbar.leftSide}
      {children}
    </>
  ),
}));
jest.mock('@kbn/unified-histogram', () => ({
  UnifiedBreakdownFieldSelector: () => <div data-test-subj="unifiedBreakdownSelector" />,
  resolveBreakdownField: () => undefined,
}));

const latencyMapFeatureFlags = createFeatureFlagsMock({
  [FEATURE_FLAGS.IS_TRACES_LATENCY_MAP_ENABLED]: true,
});

const renderGrid = async ({
  query = 'FROM traces-apm*',
  latencyMapEnabled = false,
}: { query?: string; latencyMapEnabled?: boolean } = {}) => {
  const dataSource = await EsqlSource.create({ query, resultColumns: [] });
  render(
    <TraceMetricsGrid
      {...({
        fetchParams: {
          query: { esql: query },
          dataSource,
          columns: [],
          timeRange: { from: '2026-10-26T10:00:00.000Z', to: '2026-10-26T11:00:00.000Z' },
        },
        services: {},
        renderToggleActions: () => null,
        actions: {},
        externalServices: latencyMapEnabled ? { featureFlags: latencyMapFeatureFlags } : undefined,
      } as unknown as UnifiedMetricsGridProps)}
    />
  );
};

const selectionClause = selectionToEsqlCondition({
  from: '2026-10-26T10:00:00.000Z',
  to: '2026-10-26T10:05:00.000Z',
  minDurationUs: 1000,
  maxDurationUs: 5000,
});

describe('TraceMetricsGrid', () => {
  beforeEach(() => {
    jest.mocked(TraceMetricsProvider).mockClear();
    jest.mocked(TracesLatencyMapView).mockClear();
  });

  it('passes the remote cluster prefixes of the ES|QL sources to the charts', async () => {
    const query =
      'FROM remote_cluster:apm-*, remote_cluster:traces-apm*, apm-*, traces-apm* | WHERE `trace.id` == "abc"';
    await renderGrid({ query });

    expect(jest.mocked(TraceMetricsProvider).mock.lastCall?.[0].value?.indexes).toBe(
      'remote_cluster:apm-*,remote_cluster:traces-apm*,apm-*,traces-apm*'
    );
  });

  it('shows the RED charts only, without a view switcher, while the latency map flag is off', async () => {
    await renderGrid();
    expect(screen.queryByTestId('tracesLatencyMapToggle')).not.toBeInTheDocument();
    expect(jest.mocked(TraceMetricsProvider)).toHaveBeenCalled();
    expect(jest.mocked(TracesLatencyMapView)).not.toHaveBeenCalled();
  });

  it('offers the switcher with the RED charts as the default when the latency map flag is on', async () => {
    await renderGrid({ latencyMapEnabled: true });
    expect(screen.getByTestId('tracesLatencyMapToggle')).toBeInTheDocument();
    expect(jest.mocked(TraceMetricsProvider)).toHaveBeenCalled();
    expect(jest.mocked(TracesLatencyMapView)).not.toHaveBeenCalled();
  });

  it('switches to the latency map and hides the breakdown selector there', async () => {
    await renderGrid({ latencyMapEnabled: true });
    expect(screen.getByTestId('unifiedBreakdownSelector')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('tracesLatencyMapToggle'));

    expect(jest.mocked(TracesLatencyMapView)).toHaveBeenCalled();
    expect(screen.queryByTestId('unifiedBreakdownSelector')).not.toBeInTheDocument();
  });

  it('starts on the latency map when the query arrives with a selection', async () => {
    await renderGrid({
      query: `FROM traces-apm*\n| WHERE ${selectionClause}`,
      latencyMapEnabled: true,
    });
    expect(jest.mocked(TracesLatencyMapView)).toHaveBeenCalled();
    expect(jest.mocked(TracesLatencyMapView).mock.lastCall?.[0].filters).toContain(selectionClause);
  });

  it('keeps the RED charts despite a selection in the query while the latency map flag is off', async () => {
    await renderGrid({ query: `FROM traces-apm*\n| WHERE ${selectionClause}` });
    expect(jest.mocked(TracesLatencyMapView)).not.toHaveBeenCalled();
  });
});
