/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { buildDataTableRecord } from '../../../../utils/build_data_record';
import { esHits } from '../../../../__mocks__/es_hits';
import { act, renderHook } from '@testing-library/react-hooks';
import { BehaviorSubject } from 'rxjs';
import { FetchStatus } from '../../../types';
import {
  AvailableFields$,
  DataCharts$,
  DataDocuments$,
  DataMain$,
  DataTotalHits$,
  RecordRawType,
} from '../../services/discover_data_state_container';
import type { DiscoverStateContainer } from '../../services/discover_state';
import { savedSearchMock } from '../../../../__mocks__/saved_search';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import { LocalStorageMock } from '../../../../__mocks__/local_storage_mock';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { dataViewWithTimefieldMock } from '../../../../__mocks__/data_view_with_timefield';
import {
  CHART_HIDDEN_KEY,
  HISTOGRAM_HEIGHT_KEY,
  useDiscoverHistogram,
} from './use_discover_histogram';
import { setTimeout } from 'timers/promises';
import { calculateBounds } from '@kbn/data-plugin/public';
import { getDiscoverStateMock } from '../../../../__mocks__/discover_state.mock';
import React, { ReactElement } from 'react';
import { DiscoverMainProvider } from '../../services/discover_state_provider';

const mockData = dataPluginMock.createStartContract();

mockData.query.timefilter.timefilter.getTime = () => {
  return { from: '1991-03-29T08:04:00.694Z', to: '2021-03-29T07:04:00.695Z' };
};
mockData.query.timefilter.timefilter.calculateBounds = (timeRange) => {
  return calculateBounds(timeRange);
};

let mockStorage = new LocalStorageMock({}) as unknown as Storage;
let mockCanVisualize = true;

jest.mock('../../../../hooks/use_discover_services', () => {
  const originalModule = jest.requireActual('../../../../hooks/use_discover_services');
  return {
    ...originalModule,
    useDiscoverServices: () => ({ storage: mockStorage, data: mockData }),
  };
});

jest.mock('@kbn/unified-field-list-plugin/public', () => {
  const originalModule = jest.requireActual('@kbn/unified-field-list-plugin/public');
  return {
    ...originalModule,
    getVisualizeInformation: jest.fn(() => Promise.resolve(mockCanVisualize)),
  };
});

describe('useDiscoverHistogram', () => {
  const state = getDiscoverStateMock({ isTimeBased: true });
  state.setAppState({ interval: 'auto', hideChart: false });
  const renderUseDiscoverHistogram = async ({
    isPlainRecord = false,
    isTimeBased = true,
    canVisualize = true,
    storage = new LocalStorageMock({}) as unknown as Storage,
    stateContainer = state,
  }: {
    isPlainRecord?: boolean;
    isTimeBased?: boolean;
    canVisualize?: boolean;
    storage?: Storage;
    stateContainer?: unknown;
  } = {}) => {
    mockStorage = storage;
    mockCanVisualize = canVisualize;

    const main$ = new BehaviorSubject({
      fetchStatus: FetchStatus.COMPLETE,
      recordRawType: isPlainRecord ? RecordRawType.PLAIN : RecordRawType.DOCUMENT,
      foundDocuments: true,
    }) as DataMain$;

    const documents$ = new BehaviorSubject({
      fetchStatus: FetchStatus.COMPLETE,
      result: esHits.map((esHit) => buildDataTableRecord(esHit, dataViewWithTimefieldMock)),
    }) as DataDocuments$;

    const availableFields$ = new BehaviorSubject({
      fetchStatus: FetchStatus.COMPLETE,
      fields: [] as string[],
    }) as AvailableFields$;

    const totalHits$ = new BehaviorSubject({
      fetchStatus: FetchStatus.COMPLETE,
      result: Number(esHits.length),
    }) as DataTotalHits$;

    const charts$ = new BehaviorSubject({
      fetchStatus: FetchStatus.COMPLETE,
      response: {
        took: 0,
        timed_out: false,
        _shards: {
          total: 1,
          successful: 1,
          skipped: 0,
          failed: 0,
        },
        hits: {
          total: 29,
          max_score: null,
          hits: [],
        },
        aggregations: {
          '2': {
            buckets: [
              {
                key_as_string: '2022-10-05T16:00:00.000-03:00',
                key: 1664996400000,
                doc_count: 6,
              },
              {
                key_as_string: '2022-10-05T16:30:00.000-03:00',
                key: 1664998200000,
                doc_count: 2,
              },
              {
                key_as_string: '2022-10-05T17:00:00.000-03:00',
                key: 1665000000000,
                doc_count: 3,
              },
              {
                key_as_string: '2022-10-05T17:30:00.000-03:00',
                key: 1665001800000,
                doc_count: 8,
              },
              {
                key_as_string: '2022-10-05T18:00:00.000-03:00',
                key: 1665003600000,
                doc_count: 10,
              },
            ],
          },
        },
      } as SearchResponse,
    }) as DataCharts$;

    const savedSearchData$ = {
      main$,
      documents$,
      totalHits$,
      charts$,
      availableFields$,
    };

    const hook = renderHook(
      () => {
        return useDiscoverHistogram({
          stateContainer: stateContainer as DiscoverStateContainer,
          savedSearchData$,
          dataView: dataViewWithTimefieldMock,
          savedSearch: savedSearchMock,
          isTimeBased,
          isPlainRecord,
        });
      },
      {
        wrapper: ({ children }: { children: ReactElement }) => (
          <DiscoverMainProvider value={state}>{children}</DiscoverMainProvider>
        ),
      }
    );

    await act(() => setTimeout(0));

    return hook;
  };

  const expectedChartData = {
    xAxisOrderedValues: [1664996400000, 1664998200000, 1665000000000, 1665001800000, 1665003600000],
    xAxisFormat: { id: 'date', params: { pattern: 'HH:mm:ss.SSS' } },
    xAxisLabel: 'timestamp per 0 milliseconds',
    yAxisFormat: { id: 'number' },
    ordered: {
      date: true,
      interval: 'P0D',
      intervalESUnit: 'ms',
      intervalESValue: 0,
      min: '1991-03-29T08:04:00.694Z',
      max: '2021-03-29T07:04:00.695Z',
    },
    yAxisLabel: 'Count',
    values: [
      { x: 1664996400000, y: 6 },
      { x: 1664998200000, y: 2 },
      { x: 1665000000000, y: 3 },
      { x: 1665001800000, y: 8 },
      { x: 1665003600000, y: 10 },
    ],
  };

  describe('contexts', () => {
    it('should output the correct hits context', async () => {
      const { result } = await renderUseDiscoverHistogram();
      expect(result.current.hits?.status).toBe(FetchStatus.COMPLETE);
      expect(result.current.hits?.total).toEqual(esHits.length);
    });

    it('should output the correct chart context', async () => {
      const { result } = await renderUseDiscoverHistogram();
      expect(result.current.chart?.status).toBe(FetchStatus.COMPLETE);
      expect(result.current.chart?.hidden).toBe(false);
      expect(result.current.chart?.timeInterval).toBe('auto');
      expect(result.current.chart?.bucketInterval?.toString()).toBe('P0D');
      expect(JSON.stringify(result.current.chart?.data)).toBe(JSON.stringify(expectedChartData));
      expect(result.current.chart?.error).toBeUndefined();
    });

    it('should output undefined for hits and chart if isPlainRecord is true', async () => {
      const { result } = await renderUseDiscoverHistogram({ isPlainRecord: true });
      expect(result.current.hits).toBeUndefined();
      expect(result.current.chart).toBeUndefined();
    });

    it('should output undefined for chart if isTimeBased is false', async () => {
      const { result } = await renderUseDiscoverHistogram({ isTimeBased: false });
      expect(result.current.hits).not.toBeUndefined();
      expect(result.current.chart).toBeUndefined();
    });
  });

  describe('onEditVisualization', () => {
    it('returns a callback for onEditVisualization when the data view can be visualized', async () => {
      const { result } = await renderUseDiscoverHistogram();
      expect(result.current.onEditVisualization).toBeDefined();
    });

    it('returns undefined for onEditVisualization when the data view cannot be visualized', async () => {
      const { result } = await renderUseDiscoverHistogram({ canVisualize: false });
      expect(result.current.onEditVisualization).toBeUndefined();
    });
  });

  describe('topPanelHeight', () => {
    it('should try to get the topPanelHeight from storage', async () => {
      const storage = new LocalStorageMock({}) as unknown as Storage;
      storage.get = jest.fn(() => 100);
      const { result } = await renderUseDiscoverHistogram({ storage });
      expect(storage.get).toHaveBeenCalledWith(HISTOGRAM_HEIGHT_KEY);
      expect(result.current.topPanelHeight).toBe(100);
    });

    it('should update topPanelHeight when onTopPanelHeightChange is called', async () => {
      const storage = new LocalStorageMock({}) as unknown as Storage;
      storage.get = jest.fn(() => 100);
      storage.set = jest.fn();
      const { result } = await renderUseDiscoverHistogram({ storage });
      expect(result.current.topPanelHeight).toBe(100);
      act(() => {
        result.current.onTopPanelHeightChange(200);
      });
      expect(storage.set).toHaveBeenCalledWith(HISTOGRAM_HEIGHT_KEY, 200);
      expect(result.current.topPanelHeight).toBe(200);
    });
  });

  describe('callbacks', () => {
    it('should update chartHidden when onChartHiddenChange is called', async () => {
      const storage = new LocalStorageMock({}) as unknown as Storage;
      storage.set = jest.fn();
      const stateContainer = {
        ...getDiscoverStateMock({ isTimeBased: true }),
        setAppState: jest.fn(),
      };
      const { result } = await renderUseDiscoverHistogram({
        storage,
        stateContainer,
      });
      act(() => {
        result.current.onChartHiddenChange(true);
      });
      expect(storage.set).toHaveBeenCalledWith(CHART_HIDDEN_KEY, true);
      expect(stateContainer.setAppState).toHaveBeenCalledWith({ hideChart: true });
    });

    it('should update interval when onTimeIntervalChange is called', async () => {
      const stateContainer = {
        ...getDiscoverStateMock({ isTimeBased: true }),
        setAppState: jest.fn(),
      };
      const { result } = await renderUseDiscoverHistogram({ stateContainer });
      act(() => {
        result.current.onTimeIntervalChange('auto');
      });
      expect(stateContainer.setAppState).toHaveBeenCalledWith({ interval: 'auto' });
    });
  });
});
