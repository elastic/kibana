/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

jest.mock('../utils/execute_esql_query', () => ({
  executeEsqlQuery: jest.fn(),
}));
jest.mock('../../../../hooks/use_feature_flag', () => ({
  useFeatureFlag: jest.fn(),
}));
const mockReportError = jest.fn();
jest.mock('../../../chart/hooks/use_report_chart_section_error', () => ({
  useReportChartSectionError: jest.fn(() => mockReportError),
}));

import { act, renderHook, waitFor } from '@testing-library/react';
import type { DataSource } from '@kbn/data-source';
import { EsError } from '@kbn/search-errors';
import type { ChartSectionProps } from '@kbn/unified-histogram/types';
import { getFetchParamsMock } from '@kbn/unified-histogram/__mocks__/fetch_params';
import { createMockEsqlSource } from '@kbn/data-source/src/__mocks__/esql_source.mock';
import { FEATURE_FLAGS } from '../../../../common/constants';
import { EsqlResponseError } from '../../../../common/errors/esql_response_error';
import { useFeatureFlag } from '../../../../hooks/use_feature_flag';
import { executeEsqlQuery } from '../utils/execute_esql_query';
import { MetricsExecutionContextName } from '../utils/execution_context_enums';
import {
  resetExemplarsClusterSupportCache,
  useExemplarsClusterSupport,
  type UseExemplarsClusterSupportParams,
} from './use_exemplars_cluster_support';

const mockExecuteEsqlQuery = executeEsqlQuery as jest.MockedFunction<typeof executeEsqlQuery>;
const mockUseFeatureFlag = useFeatureFlag as jest.MockedFunction<typeof useFeatureFlag>;

const TEST_PROFILE_ID = 'metrics-data-source-profile';
const PROBE_QUERY = 'SET exemplars = TRUE;\nROW 1';
const UNKNOWN_SETTING_REASON = 'Unknown setting [exemplars], did you mean [project]?';

const createParams = (
  overrides: Partial<UseExemplarsClusterSupportParams> = {}
): UseExemplarsClusterSupportParams => ({
  fetchParams: getFetchParamsMock({
    query: { esql: 'TS metrics-*' },
    dataSource: createMockEsqlSource([], [], '@timestamp', 'TS metrics-*'),
    timeRange: { from: 'now-15m', to: 'now' },
    filters: [],
    esqlVariables: [],
  }),
  services: {
    data: { search: { search: jest.fn() } },
    uiSettings: {},
  } as unknown as ChartSectionProps['services'],
  profileId: TEST_PROFILE_ID,
  isComponentVisible: true,
  ...overrides,
});

const withoutDataSource = (): UseExemplarsClusterSupportParams => {
  const params = createParams();
  return {
    ...params,
    fetchParams: { ...params.fetchParams, dataSource: undefined as unknown as DataSource },
  };
};

// Lets promise chains settle for assertions whose expected outcome is "nothing happened".
const flushAsync = () => act(async () => new Promise<void>((resolve) => setTimeout(resolve, 0)));

const renderClusterSupport = (params: UseExemplarsClusterSupportParams = createParams()) =>
  renderHook((props: UseExemplarsClusterSupportParams) => useExemplarsClusterSupport(props), {
    initialProps: params,
  });

const reload = (params: UseExemplarsClusterSupportParams): UseExemplarsClusterSupportParams => ({
  ...params,
  fetchParams: {
    ...params.fetchParams,
    lastReloadRequestTime: params.fetchParams.lastReloadRequestTime + 1,
    abortController: new AbortController(),
  },
});

describe('useExemplarsClusterSupport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetExemplarsClusterSupportCache();
    mockUseFeatureFlag.mockReturnValue(true);
    mockExecuteEsqlQuery.mockResolvedValue({} as Awaited<ReturnType<typeof executeEsqlQuery>>);
  });

  it('reads the exemplars feature flag with its registered default', async () => {
    renderClusterSupport();
    expect(mockUseFeatureFlag).toHaveBeenCalledWith(FEATURE_FLAGS.IS_EXEMPLARS_ENABLED, false);
    await flushAsync();
  });

  it.each([
    [
      'the feature flag is off',
      () => {
        mockUseFeatureFlag.mockReturnValue(false);
        return createParams();
      },
    ],
    ['the grid is hidden', () => createParams({ isComponentVisible: false })],
    ['there is no data source', withoutDataSource],
  ] as const)('does not probe when %s', async (_reason, buildParams) => {
    const { result } = renderClusterSupport(buildParams());

    await flushAsync();
    expect(mockExecuteEsqlQuery).not.toHaveBeenCalled();
    expect(result.current).toEqual({ status: 'disabled' });
  });

  it('probes once when the cluster accepts exemplars', async () => {
    const params = createParams();
    const { result, rerender } = renderClusterSupport(params);

    await waitFor(() => expect(result.current).toEqual({ status: 'supported' }));
    expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(1);
    expect(mockExecuteEsqlQuery).toHaveBeenCalledWith({
      esqlQuery: PROBE_QUERY,
      search: params.services.data.search.search,
      signal: expect.any(AbortSignal),
      uiSettings: params.services.uiSettings,
      profileId: TEST_PROFILE_ID,
      executionContextName: MetricsExecutionContextName.EXEMPLARS_CLUSTER_SUPPORT,
    });

    rerender(reload(params));
    await flushAsync();
    expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(1);
  });

  it('probes once when the setting is unknown and keeps that result', async () => {
    const error = new EsqlResponseError(
      { type: 'verification_exception', reason: UNKNOWN_SETTING_REASON },
      { status: 400 }
    );
    mockExecuteEsqlQuery.mockRejectedValue(error);
    const params = createParams();
    const { result, rerender } = renderClusterSupport(params);

    await waitFor(() =>
      expect(result.current).toEqual({ status: 'failed', errorMessage: error.message })
    );
    expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(1);
    expect(mockReportError).toHaveBeenCalledTimes(1);
    expect(mockReportError).toHaveBeenCalledWith({
      error,
      source: 'useExemplarsClusterSupport',
      labels: { profile_id: TEST_PROFILE_ID },
    });

    rerender(reload(params));
    await flushAsync();
    expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(1);
    expect(mockReportError).toHaveBeenCalledTimes(1);
  });

  it('probes once when the search service rejects an unknown setting and keeps that result', async () => {
    const error = new EsError(
      {
        statusCode: 400,
        message: UNKNOWN_SETTING_REASON,
        attributes: {
          error: { type: 'verification_exception', reason: UNKNOWN_SETTING_REASON },
        },
      },
      UNKNOWN_SETTING_REASON,
      () => {}
    );
    mockExecuteEsqlQuery.mockRejectedValue(error);
    const params = createParams();
    const { result, rerender } = renderClusterSupport(params);

    await waitFor(() =>
      expect(result.current).toEqual({ status: 'failed', errorMessage: error.message })
    );
    expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(1);
    expect(mockReportError).toHaveBeenCalledTimes(1);
    expect(mockReportError).toHaveBeenCalledWith({
      error,
      source: 'useExemplarsClusterSupport',
      labels: { profile_id: TEST_PROFILE_ID },
    });

    rerender(reload(params));
    await flushAsync();
    expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(1);
    expect(mockReportError).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['a transient error', new Error('network failure')],
    ['an error that only mentions the setting', new Error(UNKNOWN_SETTING_REASON)],
  ])('retries %s on the next fetch', async (_reason, error) => {
    mockExecuteEsqlQuery.mockRejectedValueOnce(error);
    const params = createParams();
    const { result, rerender } = renderClusterSupport(params);

    await waitFor(() =>
      expect(result.current).toEqual({ status: 'failed', errorMessage: error.message })
    );
    expect(mockReportError).toHaveBeenCalledTimes(1);

    rerender(reload(params));
    await waitFor(() => expect(result.current).toEqual({ status: 'supported' }));
    expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(2);
    expect(mockReportError).toHaveBeenCalledTimes(1);
  });

  it('does not cache an aborted probe', async () => {
    mockExecuteEsqlQuery.mockRejectedValueOnce(
      Object.assign(new Error('The operation was aborted'), { name: 'AbortError' })
    );
    const params = createParams();
    const { result, rerender } = renderClusterSupport(params);

    await flushAsync();
    expect(mockReportError).not.toHaveBeenCalled();
    expect(result.current).toEqual({ status: 'checking' });

    rerender(reload(params));
    await waitFor(() => expect(result.current).toEqual({ status: 'supported' }));
    expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(2);
  });
});
