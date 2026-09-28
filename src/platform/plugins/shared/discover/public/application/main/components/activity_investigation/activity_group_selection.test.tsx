/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { BehaviorSubject } from 'rxjs';
import type { IEsqlSearchResult } from '@kbn/search-types';
import { formatEsqlIdentifier } from '@kbn/esql-utils';
import { getDiscoverInternalStateMock } from '../../../../__mocks__/discover_state.mock';
import { DiscoverToolkitTestProvider } from '../../../../__mocks__/test_provider';
import { FetchStatus } from '../../../types';
import { internalStateActions, selectTabRuntimeState } from '../../state_management/redux';
import { detectActivityInterval } from '../../../../../common/activity_investigation/interval_detector/detect_activity_interval';
import { getActivityGroupFieldStats } from './get_activity_group_field_stats';
import { useActivityInvestigation } from './use_activity_investigation';

jest.mock(
  '../../../../../common/activity_investigation/interval_detector/detect_activity_interval',
  () => ({
    ...jest.requireActual(
      '../../../../../common/activity_investigation/interval_detector/detect_activity_interval'
    ),
    detectActivityInterval: jest.fn(),
  })
);
jest.mock('@kbn/visualization-utils', () => ({ computeInterval: () => '1 hour' }));

const QUERY = { esql: 'FROM activity-test' };
const UNPROJECTED_QUERY = QUERY;
const TIME_RANGE = { from: '2026-09-01T00:00:00.000Z', to: '2026-09-03T00:00:00.000Z' };
const START_MS = Date.parse(TIME_RANGE.from);
const HOUR_MS = 3_600_000;
const BUCKET_TIMES = Array.from({ length: 48 }, (_, index) => START_MS + index * HOUR_MS);
const CUSTOM_FIELD = 'custom.plan';
const PROFILE_FIELD = 'service.name';
const STATS_PREFIX = '__discover_activity_field_stats';
const COLUMNS = [
  { name: '@timestamp', type: 'date' },
  { name: CUSTOM_FIELD, type: 'keyword' },
  { name: 'trace.id', type: 'keyword' },
  { name: PROFILE_FIELD, type: 'keyword' },
];

type RawResponse = IEsqlSearchResult['rawResponse'];

const response = (
  columns: RawResponse['columns'],
  values: RawResponse['values']
): IEsqlSearchResult => ({
  rawResponse: {
    columns,
    values,
    is_partial: false,
    is_running: false,
    _clusters: { total: 1, successful: 1, skipped: 0, running: 0, partial: 0, failed: 0, details: {} },
  },
});

const setup = async ({
  inputQuery = QUERY,
  outputColumns = COLUMNS,
  earliestValue = '2026-01-01T00:00:00.000Z',
  metadataFailure,
  shortHistory = false,
  recommendedFields,
  edgeOnlyGroup = false,
  partialField,
  fieldStats = {},
  statsFailure,
  limitCheckValues,
  partialLimitCheck = false,
}: {
  inputQuery?: typeof QUERY;
  outputColumns?: RawResponse['columns'];
  earliestValue?: string | null;
  metadataFailure?: string;
  shortHistory?: boolean;
  recommendedFields?: string[];
  edgeOnlyGroup?: boolean;
  partialField?: string;
  fieldStats?: Record<string, { count: number; cardinality: number }>;
  statsFailure?: 'partial' | 'error' | 'malformed' | 'multiple-rows';
  limitCheckValues?: Array<string | null>;
  partialLimitCheck?: boolean;
} = {}) => {
  const toolkit = getDiscoverInternalStateMock();
  await toolkit.initializeTabs();
  const tabId = toolkit.getCurrentTab().id;
  const { dataStateContainer } = await toolkit.initializeSingleTab({
    tabId,
    dataViewSpec: { title: 'activity-test', timeFieldName: '@timestamp' },
  });
  const { services, internalState } = toolkit;
  jest
    .spyOn(services.core.featureFlags, 'getBooleanValue')
    .mockImplementation((key, fallback) =>
      key === 'discover.activityInvestigation' ? true : fallback
    );
  jest
    .spyOn(services.uiSettings, 'get')
    .mockImplementation((key) => (key === 'dateFormat:tz' ? 'UTC' : undefined));
  jest.spyOn(services.data.query.timefilter.timefilter, 'getTime').mockReturnValue(TIME_RANGE);
  jest
    .spyOn(services.data.query.timefilter.timefilter, 'getAbsoluteTime')
    .mockReturnValue(TIME_RANGE);

  internalState.dispatch(
    internalStateActions.updateAppState({
      tabId,
      appState: { query: inputQuery, esqlApproximation: false },
    })
  );
  await toolkit.waitForDataFetching({ tabId });
  internalState.dispatch(
    internalStateActions.setDataRequestParams({
      tabId,
      dataRequestParams: {
        ...toolkit.getCurrentTab().dataRequestParams,
        timeRangeAbsolute: TIME_RANGE,
      },
    })
  );

  const runtimeState = selectTabRuntimeState(toolkit.runtimeStateManager, tabId);
  const scopedProfilesManager = runtimeState.scopedProfilesManager$.getValue();
  const profiles$ = new BehaviorSubject<ReturnType<typeof scopedProfilesManager.getProfiles>>(
    recommendedFields === undefined
      ? []
      : [{ getRecommendedFields: () => () => ({ recommendedFields }) }]
  );
  jest.spyOn(scopedProfilesManager, 'getProfiles').mockImplementation(() => profiles$.getValue());
  jest.spyOn(scopedProfilesManager, 'getProfiles$').mockReturnValue(profiles$);

  const groupedFields: string[] = [];
  const limitCheckedFields: string[] = [];
  const availableGroupNames = outputColumns
    .filter(({ type }) => type === 'keyword')
    .map(({ name }) => name);
  let totalWindows = 0;
  const fieldWindows = new Map<string, number>();
  const windowTimes = (window: number): number[] =>
    shortHistory && window > 0
      ? Array.from({ length: 24 }, (_, index) => START_MS - 24 * HOUR_MS + index * HOUR_MS)
      : BUCKET_TIMES.map((time) => time - window * 7 * 24 * HOUR_MS);
  const esql = jest.spyOn(services.data.search, 'esql').mockImplementation(async ({ query }) => {
    if (query.includes('STATS earliest = MIN(')) {
      const result = response([{ name: 'earliest', type: 'date' }], [[earliestValue]]);
      if (!query.endsWith('| LIMIT 2')) {
        result.warning = 'No limit defined, adding default limit of [1000]';
      }
      return result;
    }
    if (query.includes('STATS results = COUNT(*)')) {
      const window = totalWindows++;
      return response(
        [
          { name: 'results', type: 'long' },
          { name: 'timestamp', type: 'date' },
        ],
        windowTimes(window).map((time, index) => [
          shortHistory && window === 0 && index >= 32 && index < 36 ? 40 : 10,
          new Date(time).toISOString(),
        ])
      );
    }
    if (query.endsWith('| LIMIT 0')) {
      if (metadataFailure) throw new Error(metadataFailure);
      return response(outputColumns, []);
    }

    if (query.includes('COUNT_DISTINCT(')) {
      if (statsFailure === 'error') throw new Error('Field statistics unavailable');
      const total = BUCKET_TIMES.length * 10 + (edgeOnlyGroup ? 1 : 0);
      const statsColumns: RawResponse['columns'] = [
        { name: `${STATS_PREFIX}_total`, type: 'long' },
      ];
      const statsValues: RawResponse['values'][number] = [total];
      const fieldsInQuery = availableGroupNames
        .filter((field) => query.includes(`COUNT(MV_MIN(${formatEsqlIdentifier(field)}))`))
        .sort(
          (left, right) =>
            query.indexOf(`COUNT(MV_MIN(${formatEsqlIdentifier(left)}))`) -
            query.indexOf(`COUNT(MV_MIN(${formatEsqlIdentifier(right)}))`)
        );
      fieldsInQuery.forEach((field, index) => {
        statsColumns.push(
          { name: `${STATS_PREFIX}_${index}_count`, type: 'long' },
          { name: `${STATS_PREFIX}_${index}_cardinality`, type: 'long' }
        );
        const { count, cardinality } = fieldStats[field] ?? {
          count: total,
          cardinality: edgeOnlyGroup ? 3 : 2,
        };
        statsValues.push(count, cardinality);
      });
      const result = response(statsColumns, statsFailure === 'malformed' ? [] : [statsValues]);
      if (statsFailure === 'partial') result.rawResponse.is_partial = true;
      if (statsFailure === 'multiple-rows') result.rawResponse.values.push([...statsValues]);
      if (!query.endsWith('| LIMIT 2')) {
        result.warning = 'No limit defined, adding default limit of [1000]';
      }
      return result;
    }

    if (query.includes('| STATS BY ')) {
      const field = availableGroupNames.find((name) =>
        query.includes(`| STATS BY ${formatEsqlIdentifier(name)}`)
      );
      if (!field) throw new Error(`Unexpected limit check: ${query}`);
      limitCheckedFields.push(field);
      const values =
        limitCheckValues ?? Array.from({ length: 101 }, (_, index) => `value-${index}`);
      const result = response(
        [{ name: field, type: 'keyword' }],
        values.map((value) => [value])
      );
      if (partialLimitCheck) result.rawResponse.is_partial = true;
      return result;
    }

    const field = availableGroupNames.find((name) =>
      query.includes(`__discover_activity_group = ${formatEsqlIdentifier(name)}`)
    );
    if (!field) throw new Error(`Unexpected aggregation: ${query}`);
    const window = fieldWindows.get(field) ?? 0;
    fieldWindows.set(field, window + 1);
    if (window === 0) groupedFields.push(field);
    const firstCount = field === PROFILE_FIELD ? 3 : 4;
    const values: RawResponse['values'] = windowTimes(window).flatMap((time) => [
      [firstCount, new Date(time).toISOString(), 'first'],
      [10 - firstCount, new Date(time).toISOString(), 'second'],
    ]);
    if (edgeOnlyGroup && window === 0) values.push([1, TIME_RANGE.to, 'edge-only']);
    const result = response(
      [
        { name: '__discover_activity_count', type: 'long' },
        { name: '__discover_activity_time', type: 'date' },
        { name: '__discover_activity_group', type: 'keyword' },
      ],
      values
    );
    if (field === partialField) result.rawResponse.is_partial = true;
    return result;
  });

  dataStateContainer.data$.documents$.next({ fetchStatus: FetchStatus.LOADING, query: inputQuery });
  const hook = renderHook(useActivityInvestigation, {
    wrapper: ({ children }) => (
      <DiscoverToolkitTestProvider toolkit={toolkit}>{children}</DiscoverToolkitTestProvider>
    ),
  });
  if (metadataFailure) {
    await waitFor(() => expect(hook.result.current.error).toBe('failed'));
  } else {
    await waitFor(() => expect(hook.result.current.analysis).toBeDefined());
  }
  return { ...hook, dataStateContainer, groupedFields, limitCheckedFields, esql };
};

describe('activity group selection integration', () => {
  beforeEach(() => {
    jest.mocked(detectActivityInterval).mockReturnValue({
      status: 'none',
      alpha: 0.05,
      p: 1,
      version: 'test',
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('analyzes recommended fields before other output fields without an explicit selection', async () => {
    const { groupedFields, unmount } = await setup({
      inputQuery: UNPROJECTED_QUERY,
      recommendedFields: [PROFILE_FIELD, 'missing.field'],
    });
    expect(groupedFields).toEqual([PROFILE_FIELD, CUSTOM_FIELD]);
    expect(detectActivityInterval).toHaveBeenCalledTimes(5);
    unmount();
  });

  it('analyzes eligible output fields even without profile recommendations or KEEP', async () => {
    const { groupedFields, unmount } = await setup({ inputQuery: UNPROJECTED_QUERY });
    expect(groupedFields).toEqual([CUSTOM_FIELD, PROFILE_FIELD]);
    expect(detectActivityInterval).toHaveBeenCalledTimes(5);
    unmount();
  });

  it('analyzes fields used in WHERE before profile recommendations and remaining fields', async () => {
    const { groupedFields, esql, unmount } = await setup({
      inputQuery: { esql: `${QUERY.esql} | WHERE custom.plan != "ignore"` },
      recommendedFields: [PROFILE_FIELD],
      outputColumns: [...COLUMNS, { name: 'region', type: 'keyword' }],
    });
    expect(groupedFields).toEqual([CUSTOM_FIELD, PROFILE_FIELD, 'region']);
    expect(detectActivityInterval).toHaveBeenCalledTimes(7);
    expect(
      esql.mock.calls
        .filter(([request]) => !request.query.includes('STATS earliest = MIN('))
        .every(([request]) => request.query.includes('WHERE custom.plan != "ignore"'))
    ).toBe(true);
    unmount();
  });

  it('does not analyze the last tier after ten distinct fields have admitted increases', async () => {
    const additionalProfileFields = Array.from({ length: 8 }, (_, index) => `profile.field_${index}`);
    jest.mocked(detectActivityInterval).mockReturnValue({
      status: 'admitted',
      interval: { start: 24, end: 30 },
      candidate: {
        start: 24,
        end: 30,
        reference: { start: 10, end: 23 },
        observed: 120,
        referenceObserved: 130,
        referenceMean: 10,
        expectedFromInternalReference: 60,
        excess: 60,
        relativeIncrease: 1,
        historical: {
          score: 10,
          expected: 60,
          insideMultiplier: 2,
          outsideMultiplier: 1,
          p: 0.01,
        },
      },
      alpha: 0.05,
      p: 0.01,
      replicates: 999,
      version: 'test',
    });
    const { groupedFields, result, unmount } = await setup({
      inputQuery: { esql: `${QUERY.esql} | WHERE custom.plan != "ignore"` },
      recommendedFields: [PROFILE_FIELD, ...additionalProfileFields],
      outputColumns: [
        ...COLUMNS,
        ...additionalProfileFields.map((name) => ({ name, type: 'keyword' })),
        { name: 'region', type: 'keyword' },
      ],
    });
    expect(groupedFields).toEqual([CUSTOM_FIELD, PROFILE_FIELD, ...additionalProfileFields]);
    expect(result.current.analysis?.results.map(({ actor }) => actor?.field)).toEqual([
      undefined,
      CUSTOM_FIELD,
      PROFILE_FIELD,
      ...additionalProfileFields,
    ]);
    expect(detectActivityInterval).toHaveBeenCalledTimes(21);
    unmount();
  });

  it('does not recover recommended fields excluded from the output by DROP', async () => {
    const { groupedFields, unmount } = await setup({
      inputQuery: { esql: `${UNPROJECTED_QUERY.esql} | DROP service.name` },
      outputColumns: COLUMNS.filter(({ name }) => name !== PROFILE_FIELD),
      recommendedFields: [PROFILE_FIELD],
    });
    expect(groupedFields).toEqual([CUSTOM_FIELD]);
    expect(detectActivityInterval).toHaveBeenCalledTimes(3);
    unmount();
  });

  it('only analyzes columns retained by KEEP, even if other columns are recommended', async () => {
    const { groupedFields, esql, unmount } = await setup({
      inputQuery: { esql: `${QUERY.esql} | KEEP @timestamp, custom.plan` },
      outputColumns: COLUMNS.filter(({ name }) => name === '@timestamp' || name === CUSTOM_FIELD),
      recommendedFields: [PROFILE_FIELD],
    });
    expect(groupedFields).toEqual([CUSTOM_FIELD]);
    expect(detectActivityInterval).toHaveBeenCalledTimes(3);
    expect(esql.mock.calls.some(([request]) => request.query.includes(PROFILE_FIELD))).toBe(false);
    unmount();
  });

  it('does not remove DROP to recover a time field missing from the final output', async () => {
    const { result, esql, unmount } = await setup({
      inputQuery: { esql: `${QUERY.esql} | DROP @timestamp` },
      outputColumns: COLUMNS.filter(({ name }) => name !== '@timestamp'),
    });
    expect(result.current.analysis?.unassessableReason).toBe('missing-time-field');
    expect(esql).toHaveBeenCalledTimes(1);
    expect(detectActivityInterval).not.toHaveBeenCalled();
    unmount();
  });

  it('treats a null source timestamp as unavailable history, not 1970', async () => {
    const { result, unmount } = await setup({ earliestValue: null });
    expect(result.current.analysis?.unassessableReason).toBe('insufficient-history');
    expect(detectActivityInterval).not.toHaveBeenCalled();
    unmount();
  });

  it('preserves the diagnostic message when a query fails', async () => {
    const { result, unmount } = await setup({ metadataFailure: 'Query execution failed' });
    expect(result.current.errorDetails).toBe('Query execution failed');
    expect(detectActivityInterval).not.toHaveBeenCalled();
    unmount();
  });

  it('uses a real earlier day without calling B when full references are unavailable', async () => {
    const { result, esql, unmount } = await setup({
      earliestValue: '2026-08-31T00:00:00.000Z',
      outputColumns: [{ name: '@timestamp', type: 'date' }],
      shortHistory: true,
    });
    expect(detectActivityInterval).not.toHaveBeenCalled();
    expect(esql).toHaveBeenCalledTimes(4);
    expect(result.current.analysis?.results[0]?.increase.kind).toBe('exploratory_interval');
    expect(result.current.analysis?.results[0]?.increase.pvalue).toBeUndefined();
    expect(result.current.analysis?.results[0]?.increase.historicalComparison).toBeDefined();
    expect(result.current.analysis?.unassessableReason).toBeUndefined();
    unmount();
  });

  it('does not turn an unassessable detector result into no increase', async () => {
    jest.mocked(detectActivityInterval).mockReturnValue({
      status: 'unassessable',
      reason: 'no-calibratable-intervals',
      version: 'test',
    });
    const { result, unmount } = await setup();
    expect(result.current.analysis).toEqual({
      results: [],
      groupAnalysisIncomplete: true,
      unassessableReason: 'no-calibratable-intervals',
    });
    unmount();
  });

  it.each([
    {
      label: 'with a profile',
      recommendedFields: [PROFILE_FIELD, 'trace.id', 'missing.field'],
      expected: [PROFILE_FIELD, CUSTOM_FIELD],
    },
    {
      label: 'without a profile',
      recommendedFields: undefined,
      expected: [CUSTOM_FIELD, PROFILE_FIELD],
    },
  ])('collects eligible fields once $label', async ({ recommendedFields, expected }) => {
    const { esql, groupedFields, result, dataStateContainer, rerender, unmount } = await setup({
      recommendedFields,
    });

    expect(groupedFields).toEqual(expected);
    const expectedQueries = recommendedFields ? 25 : 24;
    expect(esql).toHaveBeenCalledTimes(expectedQueries);
    expect(detectActivityInterval).toHaveBeenCalledTimes(5);
    const series = jest.mocked(detectActivityInterval).mock.calls.map(([input]) => input.current);
    expect(series).toHaveLength(5);
    expect(series.map((counts) => counts[0])).toEqual(
      recommendedFields ? [10, 3, 7, 4, 6] : [10, 4, 6, 3, 7]
    );
    expect(result.current.analysis).toEqual({ results: [], groupAnalysisIncomplete: false });
    for (const [request, options] of esql.mock.calls) {
      if (request.query.includes('STATS earliest = MIN(')) {
        expect(request.filter).toBeUndefined();
        expect(request.query).toContain('| LIMIT 2');
      } else {
        expect(request.query).toContain(QUERY.esql);
        expect(request.filter).toBeDefined();
      }
      expect(request.timeZone).toBe('UTC');
      expect(options?.approximation).toBe(false);
      expect(options?.includeExecutionMetadata).toBe(true);
    }
    for (const [input] of jest.mocked(detectActivityInterval).mock.calls) {
      expect(input.references).toHaveLength(6);
      expect(input.references.every((counts) => counts.length === input.current.length)).toBe(true);
    }

    await act(async () => {
      dataStateContainer.data$.documents$.next({ fetchStatus: FetchStatus.COMPLETE, query: QUERY });
    });
    rerender();
    expect(esql).toHaveBeenCalledTimes(expectedQueries);
    expect(detectActivityInterval).toHaveBeenCalledTimes(5);
    unmount();
  });

  it('does not send edge-only groups to the detector', async () => {
    const { esql, result, unmount } = await setup({ edgeOnlyGroup: true });
    const series = jest.mocked(detectActivityInterval).mock.calls.map(([input]) => input.current);

    expect(esql).toHaveBeenCalledTimes(24);
    expect(series).toHaveLength(5);
    expect(series.every((counts) => counts.some((count) => count > 0))).toBe(true);
    expect(result.current.analysis?.groupAnalysisIncomplete).toBe(false);
    unmount();
  });

  it('reports an incomplete prioritized field while still analyzing other eligible fields', async () => {
    const { groupedFields, result, unmount } = await setup({
      recommendedFields: [PROFILE_FIELD],
      partialField: PROFILE_FIELD,
    });
    const series = jest.mocked(detectActivityInterval).mock.calls.map(([input]) => input.current);

    expect(groupedFields).toEqual([PROFILE_FIELD, CUSTOM_FIELD]);
    expect(series).toHaveLength(3);
    expect(result.current.analysis?.groupAnalysisIncomplete).toBe(true);
    unmount();
  });

  it('skips wholly missing fields without discarding other fields', async () => {
    const { groupedFields, limitCheckedFields, result, unmount } = await setup({
      fieldStats: { [CUSTOM_FIELD]: { count: 0, cardinality: 0 } },
    });

    expect(groupedFields).toEqual([PROFILE_FIELD]);
    expect(limitCheckedFields).toEqual([]);
    expect(result.current.analysis?.groupAnalysisIncomplete).toBe(false);
    unmount();
  });

  it('confirms a high cardinality estimate before skipping the temporal aggregation', async () => {
    const { groupedFields, limitCheckedFields, esql, result, unmount } = await setup({
      fieldStats: { [CUSTOM_FIELD]: { count: 480, cardinality: 150 } },
    });

    expect(limitCheckedFields).toEqual([CUSTOM_FIELD]);
    expect(groupedFields).toEqual([PROFILE_FIELD]);
    expect(result.current.analysis?.groupAnalysisIncomplete).toBe(true);
    expect(
      esql.mock.calls.find(([request]) => request.query.includes('| STATS BY '))?.[0].query
    ).toContain('| LIMIT 101');
    unmount();
  });

  it('does not exclude a field solely because its cardinality estimate is too high', async () => {
    const { groupedFields, limitCheckedFields, result, unmount } = await setup({
      fieldStats: { [CUSTOM_FIELD]: { count: 480, cardinality: 101 } },
      limitCheckValues: ['first', 'second'],
    });

    expect(limitCheckedFields).toEqual([CUSTOM_FIELD]);
    expect(groupedFields).toEqual([CUSTOM_FIELD, PROFILE_FIELD]);
    expect(result.current.analysis?.groupAnalysisIncomplete).toBe(false);
    unmount();
  });

  it('includes the missing-value group when checking the existing group limit', async () => {
    const { groupedFields, limitCheckedFields, result, unmount } = await setup({
      fieldStats: { [CUSTOM_FIELD]: { count: 479, cardinality: 100 } },
      limitCheckValues: [...Array.from({ length: 100 }, (_, index) => `value-${index}`), null],
    });

    expect(limitCheckedFields).toEqual([CUSTOM_FIELD]);
    expect(groupedFields).toEqual([PROFILE_FIELD]);
    expect(result.current.analysis?.groupAnalysisIncomplete).toBe(true);
    unmount();
  });

  it.each(['partial', 'error', 'malformed', 'multiple-rows'] as const)(
    'falls back to normal collection after a %s statistics response',
    async (statsFailure) => {
      const { groupedFields, result, unmount } = await setup({ statsFailure });

      expect(groupedFields).toEqual([CUSTOM_FIELD, PROFILE_FIELD]);
      expect(result.current.analysis?.groupAnalysisIncomplete).toBe(false);
      unmount();
    }
  );

  it('does not exclude a field after an incomplete exact limit check', async () => {
    const { groupedFields, result, unmount } = await setup({
      fieldStats: { [CUSTOM_FIELD]: { count: 480, cardinality: 150 } },
      partialLimitCheck: true,
    });

    expect(groupedFields).toEqual([CUSTOM_FIELD, PROFILE_FIELD]);
    expect(result.current.analysis?.groupAnalysisIncomplete).toBe(false);
    unmount();
  });

  it('batches all fields without inserting a sampling limit before the statistics', async () => {
    const fields = Array.from({ length: 31 }, (_, index) => ({ name: `custom.field_${index}` }));
    const makeStatsResponse = (size: number) =>
      response(
        [
          { name: `${STATS_PREFIX}_total`, type: 'long' },
          ...Array.from({ length: size }, (_, index) => [
            { name: `${STATS_PREFIX}_${index}_count`, type: 'long' },
            { name: `${STATS_PREFIX}_${index}_cardinality`, type: 'long' },
          ]).flat(),
        ],
        [[480, ...Array.from({ length: size }, () => [480, 2]).flat()]]
      );
    const execute = jest
      .fn()
      .mockResolvedValueOnce(makeStatsResponse(30))
      .mockResolvedValueOnce(makeStatsResponse(1));
    const query = `${QUERY.esql} | SORT @timestamp DESC | LIMIT 500`;

    const stats = await getActivityGroupFieldStats({
      query,
      fields,
      minimumTotal: 480,
      execute,
      signal: new AbortController().signal,
    });

    expect(stats.size).toBe(31);
    expect(execute).toHaveBeenCalledTimes(2);
    expect(execute.mock.calls[0][0]).toContain(
      `COUNT_DISTINCT(${formatEsqlIdentifier('custom.field_29')})`
    );
    expect(execute.mock.calls[0][0]).not.toContain('custom.field_30');
    expect(execute.mock.calls[1][0]).toContain(
      `COUNT(MV_MIN(${formatEsqlIdentifier('custom.field_30')}))`
    );
    for (const [statsQuery] of execute.mock.calls) {
      expect(statsQuery).toContain(`${query}\n| STATS `);
      expect(statsQuery.endsWith('\n| LIMIT 2')).toBe(true);
      expect(statsQuery.match(/\bLIMIT\b/g)).toHaveLength(2);
    }
  });

  it('propagates cancellation instead of falling back to more requests', async () => {
    const controller = new AbortController();
    const execute = jest.fn(async () => {
      controller.abort();
      throw new Error('Request aborted');
    });

    await expect(
      getActivityGroupFieldStats({
        query: QUERY.esql,
        fields: [{ name: CUSTOM_FIELD }],
        minimumTotal: 480,
        execute,
        signal: controller.signal,
      })
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(execute).toHaveBeenCalledTimes(1);
  });
});
