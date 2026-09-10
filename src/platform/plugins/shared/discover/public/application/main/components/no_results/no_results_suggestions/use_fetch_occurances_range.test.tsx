/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { waitFor, renderHook } from '@testing-library/react';
import * as RxApi from 'rxjs';
import {
  stubDataView,
  stubDataViewWithDateNanos,
  stubDataViewWithoutTimeField,
} from '@kbn/data-views-plugin/common/data_view.stub';
import type { Query } from '@kbn/es-query';
import { DiscoverTestProvider } from '../../../../../__mocks__/test_provider';
import { createDiscoverServicesMock } from '../../../../../__mocks__/services';
import {
  useFetchOccurrencesRange,
  TimeRangeExtendingStatus,
  type Params,
} from './use_fetch_occurances_range';

const services = createDiscoverServicesMock();

const lastValueFromSpy = jest.spyOn(RxApi, 'lastValueFrom');

const render = async (params: Omit<Params, 'services'>) => {
  const hookResult = renderHook(() => useFetchOccurrencesRange({ ...params, services }), {
    wrapper: ({ children }: React.PropsWithChildren) => (
      <DiscoverTestProvider services={services}>{children}</DiscoverTestProvider>
    ),
  });
  await waitFor(() => new Promise((resolve) => resolve(null)));

  return hookResult;
};

describe('useFetchOccurrencesRange', () => {
  beforeEach(() => {
    lastValueFromSpy.mockClear();
  });

  describe('with time-based data view', () => {
    const query: Query = { language: 'lucene', query: '' };

    it('should return success with results when documents are found', async () => {
      lastValueFromSpy.mockImplementation(async () => ({
        rawResponse: {
          aggregations: {
            earliest_timestamp: {
              value_as_string: '2026-01-01T10:23:50.000Z',
            },
            latest_timestamp: {
              value_as_string: '2026-10-01T11:25:32.000Z',
            },
          },
        },
      }));

      const { result } = await render({
        dataView: stubDataView,
        query,
        filters: [],
      });

      const fetchResult = await result.current.fetch();

      expect(lastValueFromSpy).toHaveBeenCalledTimes(1);
      expect(fetchResult.status).toBe(TimeRangeExtendingStatus.succeedWithResults);
      expect(fetchResult.range).toEqual({
        from: '2026-01-01T10:23:50.000Z',
        to: '2026-10-01T11:25:32.000Z',
      });
    });

    it('should return success without results when no documents are found', async () => {
      lastValueFromSpy.mockImplementation(async () => ({
        rawResponse: {
          aggregations: {},
        },
      }));

      const { result } = await render({
        dataView: stubDataView,
        query,
        filters: [],
      });

      const fetchResult = await result.current.fetch();

      expect(lastValueFromSpy).toHaveBeenCalledTimes(1);
      expect(fetchResult.status).toBe(TimeRangeExtendingStatus.succeedWithoutResults);
      expect(fetchResult.range).toBeUndefined();
    });

    it('should return timed out status when search times out', async () => {
      lastValueFromSpy.mockImplementation(async () => ({
        rawResponse: {
          timed_out: true,
          aggregations: {
            earliest_timestamp: {
              value_as_string: '2026-01-01T10:23:50.000Z',
            },
            latest_timestamp: {
              value_as_string: '2026-10-01T11:25:32.000Z',
            },
          },
        },
      }));

      const { result } = await render({
        dataView: stubDataView,
        query,
        filters: [],
      });

      const fetchResult = await result.current.fetch();

      expect(lastValueFromSpy).toHaveBeenCalledTimes(1);
      expect(fetchResult.status).toBe(TimeRangeExtendingStatus.timedOut);
      expect(fetchResult.range).toBeUndefined();
    });

    it('should return failed status when clusters are not successful', async () => {
      lastValueFromSpy.mockImplementation(async () => ({
        rawResponse: {
          _clusters: {
            total: 2,
            successful: 1,
          },
          aggregations: {
            earliest_timestamp: {
              value_as_string: '2026-01-01T10:23:50.000Z',
            },
            latest_timestamp: {
              value_as_string: '2026-10-01T11:25:32.000Z',
            },
          },
        },
      }));

      const { result } = await render({
        dataView: stubDataView,
        query,
        filters: [],
      });

      const fetchResult = await result.current.fetch();

      expect(lastValueFromSpy).toHaveBeenCalledTimes(1);
      expect(fetchResult.status).toBe(TimeRangeExtendingStatus.failed);
      expect(fetchResult.range).toBeUndefined();
    });

    it('should return failed status when shards are not successful', async () => {
      lastValueFromSpy.mockImplementation(async () => ({
        rawResponse: {
          _shards: {
            total: 5,
            successful: 4,
          },
          aggregations: {
            earliest_timestamp: {
              value_as_string: '2026-01-01T10:23:50.000Z',
            },
            latest_timestamp: {
              value_as_string: '2026-10-01T11:25:32.000Z',
            },
          },
        },
      }));

      const { result } = await render({
        dataView: stubDataView,
        query,
        filters: [],
      });

      const fetchResult = await result.current.fetch();

      expect(lastValueFromSpy).toHaveBeenCalledTimes(1);
      expect(fetchResult.status).toBe(TimeRangeExtendingStatus.failed);
      expect(fetchResult.range).toBeUndefined();
    });

    it('should pass strict_date_optional_time format to aggregations', async () => {
      lastValueFromSpy.mockImplementation(async () => ({
        rawResponse: {
          aggregations: {
            earliest_timestamp: {
              value_as_string: '2026-01-01T10:23:50.000Z',
            },
            latest_timestamp: {
              value_as_string: '2026-10-01T11:25:32.000Z',
            },
          },
        },
      }));

      const { result } = await render({
        dataView: stubDataView,
        query,
        filters: [],
      });

      await result.current.fetch();

      expect(services.data.search.search).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            aggs: expect.objectContaining({
              earliest_timestamp: expect.objectContaining({
                min: expect.objectContaining({
                  format: 'strict_date_optional_time',
                }),
              }),
              latest_timestamp: expect.objectContaining({
                max: expect.objectContaining({
                  format: 'strict_date_optional_time',
                }),
              }),
            }),
          }),
        }),
        expect.any(Object)
      );
    });

    it('should round up date_nanos timestamps to next millisecond', async () => {
      lastValueFromSpy.mockImplementation(async () => ({
        rawResponse: {
          aggregations: {
            earliest_timestamp: {
              value_as_string: '2023-05-10T11:01:10.561Z',
            },
            latest_timestamp: {
              value_as_string: '2023-05-11T11:01:10.562Z',
            },
          },
        },
      }));

      const { result } = await render({
        dataView: stubDataViewWithDateNanos,
        query,
        filters: [],
      });

      const fetchResult = await result.current.fetch();

      expect(fetchResult.status).toBe(TimeRangeExtendingStatus.succeedWithResults);
      expect(fetchResult.range).toEqual({
        from: '2023-05-10T11:01:10.561Z',
        to: '2023-05-11T11:01:10.563Z', // Rounded up by 1ms
      });
    });

    it('should handle AbortError silently', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      lastValueFromSpy.mockImplementation(async () => {
        const error = new Error('Aborted');
        error.name = 'AbortError';
        throw error;
      });

      const { result } = await render({
        dataView: stubDataView,
        query,
        filters: [],
      });

      const fetchResult = await result.current.fetch();

      expect(fetchResult.status).toBe(TimeRangeExtendingStatus.failed);
      expect(consoleErrorSpy).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('without time-based data view', () => {
    it('should return failed status for non-time-based data view', async () => {
      const { result } = await render({
        dataView: stubDataViewWithoutTimeField,
        query: { language: 'lucene', query: '' },
        filters: [],
      });

      const fetchResult = await result.current.fetch();

      expect(lastValueFromSpy).not.toHaveBeenCalled();
      expect(fetchResult.status).toBe(TimeRangeExtendingStatus.failed);
      expect(fetchResult.range).toBeUndefined();
    });

    it('should return failed status when data view is undefined', async () => {
      const { result } = await render({
        dataView: undefined,
        query: { language: 'lucene', query: '' },
        filters: [],
      });

      const fetchResult = await result.current.fetch();

      expect(lastValueFromSpy).not.toHaveBeenCalled();
      expect(fetchResult.status).toBe(TimeRangeExtendingStatus.failed);
      expect(fetchResult.range).toBeUndefined();
    });

    it('should return failed status when query is undefined', async () => {
      const { result } = await render({
        dataView: stubDataView,
        query: undefined,
        filters: [],
      });

      const fetchResult = await result.current.fetch();

      expect(lastValueFromSpy).not.toHaveBeenCalled();
      expect(fetchResult.status).toBe(TimeRangeExtendingStatus.failed);
      expect(fetchResult.range).toBeUndefined();
    });
  });
});
