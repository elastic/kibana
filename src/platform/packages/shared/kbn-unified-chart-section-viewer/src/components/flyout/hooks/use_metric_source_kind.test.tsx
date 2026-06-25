/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import type {
  DataViewsPublicPluginStart,
  IndexKind,
  MatchedItem,
} from '@kbn/data-views-plugin/public';
import {
  ExternalServicesProvider,
  type ExternalServices,
} from '../../../context/external_services';
import { useReportChartSectionError } from '../../chart/hooks/use_report_chart_section_error';
import { useMetricsExperienceState } from '../../observability/metrics/context/metrics_experience_state_provider';
import {
  METRIC_SOURCE_KIND,
  resetMetricSourceKindCache,
  useMetricSourceKind,
} from './use_metric_source_kind';

const mockReportError = jest.fn();
jest.mock('../../chart/hooks/use_report_chart_section_error', () => ({
  useReportChartSectionError: jest.fn(() => mockReportError),
}));

jest.mock('../../observability/metrics/context/metrics_experience_state_provider', () => ({
  useMetricsExperienceState: jest.fn(),
}));

const mockedUseMetricsExperienceState = useMetricsExperienceState as jest.Mock;
const mockedUseReportChartSectionError = useReportChartSectionError as jest.Mock;
const TEST_PROFILE_ID = 'metrics-data-source-profile';

const matchedItem = (name: string, key: IndexKind): MatchedItem =>
  ({
    name,
    tags: [{ key, name: key, color: 'default' }],
    item: { name },
  } as unknown as MatchedItem);

const buildDataViews = (impl: jest.Mock) =>
  ({ getIndices: impl } as unknown as DataViewsPublicPluginStart);

const buildWrapper = (externalServices: ExternalServices | undefined) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <ExternalServicesProvider externalServices={externalServices}>
      {children}
    </ExternalServicesProvider>
  );
  return Wrapper;
};

describe('useMetricSourceKind', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseReportChartSectionError.mockReturnValue(mockReportError);
    mockedUseMetricsExperienceState.mockReturnValue({ profileId: TEST_PROFILE_ID });
    // The hook caches in-flight promises in a module-level Map that persists
    // across tests within the same Jest worker. Clear it so each test starts
    // from a clean slate and tests can safely reuse source names.
    resetMetricSourceKindCache();
  });

  it('returns the provided fallback when external services are absent', () => {
    const { result } = renderHook(
      () =>
        useMetricSourceKind({ name: 'logs-foo-default', fallback: METRIC_SOURCE_KIND.DATA_STREAM }),
      { wrapper: buildWrapper(undefined) }
    );
    expect(result.current).toEqual({ kind: METRIC_SOURCE_KIND.DATA_STREAM });
  });

  it('returns the provided fallback when dataViews is missing', () => {
    const { result } = renderHook(
      () => useMetricSourceKind({ name: 'logs-foo-default', fallback: METRIC_SOURCE_KIND.INDEX }),
      { wrapper: buildWrapper({}) }
    );
    expect(result.current).toEqual({ kind: METRIC_SOURCE_KIND.INDEX });
  });

  it('returns the fallback when name is undefined and does not call getIndices', () => {
    const getIndices = jest.fn();
    const { result } = renderHook(
      () => useMetricSourceKind({ name: undefined, fallback: METRIC_SOURCE_KIND.DATA_STREAM }),
      { wrapper: buildWrapper({ dataViews: buildDataViews(getIndices) }) }
    );
    expect(result.current).toEqual({ kind: METRIC_SOURCE_KIND.DATA_STREAM });
    expect(getIndices).not.toHaveBeenCalled();
  });

  it('returns INDEX when getIndices matches a plain index by tag key', async () => {
    const getIndices = jest.fn().mockResolvedValue([matchedItem('metrics-plain-index', 'index')]);
    const { result } = renderHook(
      () =>
        useMetricSourceKind({
          name: 'metrics-plain-index',
          fallback: METRIC_SOURCE_KIND.DATA_STREAM,
        }),
      { wrapper: buildWrapper({ dataViews: buildDataViews(getIndices) }) }
    );

    await waitFor(() => expect(result.current.kind).toBe(METRIC_SOURCE_KIND.INDEX));
    expect(getIndices).toHaveBeenCalledWith({
      pattern: 'metrics-plain-index',
      showAllIndices: true,
      isRollupIndex: expect.any(Function),
    });
  });

  it('returns DATA_STREAM when getIndices matches a data stream', async () => {
    const getIndices = jest.fn().mockResolvedValue([matchedItem('logs-ds', 'data_stream')]);
    const { result } = renderHook(
      () => useMetricSourceKind({ name: 'logs-ds', fallback: METRIC_SOURCE_KIND.INDEX }),
      { wrapper: buildWrapper({ dataViews: buildDataViews(getIndices) }) }
    );

    await waitFor(() => expect(result.current.kind).toBe(METRIC_SOURCE_KIND.DATA_STREAM));
  });

  it('falls back to the provided fallback when the name is not in the response', async () => {
    const getIndices = jest.fn().mockResolvedValue([matchedItem('other-source', 'index')]);
    const { result } = renderHook(
      () =>
        useMetricSourceKind({ name: 'not-in-response', fallback: METRIC_SOURCE_KIND.DATA_STREAM }),
      { wrapper: buildWrapper({ dataViews: buildDataViews(getIndices) }) }
    );

    await waitFor(() => expect(getIndices).toHaveBeenCalled());
    expect(result.current.kind).toBe(METRIC_SOURCE_KIND.DATA_STREAM);
  });

  it('falls back to the provided fallback and evicts the cache when getIndices rejects', async () => {
    const getIndices = jest
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce([matchedItem('retry-source', 'index')]);
    const wrapper = buildWrapper({ dataViews: buildDataViews(getIndices) });

    const first = renderHook(
      () => useMetricSourceKind({ name: 'retry-source', fallback: METRIC_SOURCE_KIND.DATA_STREAM }),
      { wrapper }
    );
    await waitFor(() => expect(getIndices).toHaveBeenCalledTimes(1));
    expect(first.result.current.kind).toBe(METRIC_SOURCE_KIND.DATA_STREAM);

    const second = renderHook(
      () => useMetricSourceKind({ name: 'retry-source', fallback: METRIC_SOURCE_KIND.DATA_STREAM }),
      { wrapper }
    );
    await waitFor(() => expect(second.result.current.kind).toBe(METRIC_SOURCE_KIND.INDEX));
    expect(getIndices).toHaveBeenCalledTimes(2);
  });

  it('evicts the cache when source is not in the response so subsequent lookups retry', async () => {
    const getIndices = jest
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([matchedItem('eventually-found', 'data_stream')]);
    const wrapper = buildWrapper({ dataViews: buildDataViews(getIndices) });

    const first = renderHook(
      () => useMetricSourceKind({ name: 'eventually-found', fallback: METRIC_SOURCE_KIND.INDEX }),
      { wrapper }
    );
    await waitFor(() => expect(getIndices).toHaveBeenCalledTimes(1));
    expect(first.result.current.kind).toBe(METRIC_SOURCE_KIND.INDEX);

    const second = renderHook(
      () => useMetricSourceKind({ name: 'eventually-found', fallback: METRIC_SOURCE_KIND.INDEX }),
      { wrapper }
    );
    await waitFor(() => expect(second.result.current.kind).toBe(METRIC_SOURCE_KIND.DATA_STREAM));
    expect(getIndices).toHaveBeenCalledTimes(2);
  });

  it('deduplicates concurrent requests for the same name (cache)', async () => {
    const getIndices = jest.fn().mockResolvedValue([matchedItem('dedup-source', 'index')]);
    const wrapper = buildWrapper({ dataViews: buildDataViews(getIndices) });

    const a = renderHook(
      () => useMetricSourceKind({ name: 'dedup-source', fallback: METRIC_SOURCE_KIND.DATA_STREAM }),
      { wrapper }
    );
    const b = renderHook(
      () => useMetricSourceKind({ name: 'dedup-source', fallback: METRIC_SOURCE_KIND.DATA_STREAM }),
      { wrapper }
    );

    await waitFor(() => expect(a.result.current.kind).toBe(METRIC_SOURCE_KIND.INDEX));
    await waitFor(() => expect(b.result.current.kind).toBe(METRIC_SOURCE_KIND.INDEX));
    expect(getIndices).toHaveBeenCalledTimes(1);
  });

  it('does not expose the previous source kind when the name changes (stale guard)', async () => {
    const getIndices = jest.fn(async (args: { pattern: string }) =>
      args.pattern === 'first-source'
        ? [matchedItem('first-source', 'index')]
        : new Promise(() => {})
    );

    const { result, rerender } = renderHook(
      ({ name }: { name: string }) =>
        useMetricSourceKind({ name, fallback: METRIC_SOURCE_KIND.DATA_STREAM }),
      {
        initialProps: { name: 'first-source' },
        wrapper: buildWrapper({ dataViews: buildDataViews(getIndices) }),
      }
    );

    await waitFor(() => expect(result.current.kind).toBe(METRIC_SOURCE_KIND.INDEX));

    rerender({ name: 'second-source' });

    expect(result.current.kind).toBe(METRIC_SOURCE_KIND.DATA_STREAM);
  });

  it('reports to APM when getIndices throws and still returns the fallback', async () => {
    const error = new Error('network failure');
    const getIndices = jest.fn().mockRejectedValue(error);

    const { result } = renderHook(
      () =>
        useMetricSourceKind({ name: 'failing-source', fallback: METRIC_SOURCE_KIND.DATA_STREAM }),
      { wrapper: buildWrapper({ dataViews: buildDataViews(getIndices) }) }
    );

    await waitFor(() => expect(getIndices).toHaveBeenCalled());
    expect(result.current).toEqual({ kind: METRIC_SOURCE_KIND.DATA_STREAM });
    expect(mockReportError).toHaveBeenCalledTimes(1);
    expect(mockReportError).toHaveBeenCalledWith({
      error,
      source: 'useMetricSourceKind',
      labels: { profile_id: TEST_PROFILE_ID },
    });
  });
});
