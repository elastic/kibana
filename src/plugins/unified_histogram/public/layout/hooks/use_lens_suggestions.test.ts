/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { renderHook } from '@testing-library/react-hooks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { calculateBounds } from '@kbn/data-plugin/public';
import { deepMockedFields, buildDataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { allSuggestionsMock } from '../../__mocks__/suggestions';
import { useLensSuggestions } from './use_lens_suggestions';

describe('useLensSuggestions', () => {
  const dataMock = dataPluginMock.createStartContract();
  dataMock.query.timefilter.timefilter.calculateBounds = (timeRange) => {
    return calculateBounds(timeRange);
  };
  const dataViewMock = buildDataViewMock({
    name: 'the-data-view',
    fields: deepMockedFields,
    timeFieldName: '@timestamp',
  });

  test('should return empty suggestions for non aggregate query', async () => {
    const { result } = renderHook(() => {
      return useLensSuggestions({
        dataView: dataViewMock,
        query: undefined,
        isPlainRecord: false,
        data: dataMock,
        lensSuggestionsApi: jest.fn(),
      });
    });
    const current = result.current;
    expect(current).toStrictEqual({
      allSuggestions: [],
      currentSuggestion: undefined,
      isOnHistogramMode: false,
      histogramQuery: undefined,
      suggestionUnsupported: false,
    });
  });

  test('should return suggestions for aggregate query', async () => {
    const { result } = renderHook(() => {
      return useLensSuggestions({
        dataView: dataViewMock,
        query: { esql: 'from the-data-view | stats maxB = max(bytes)' },
        isPlainRecord: true,
        columns: [
          {
            id: 'var0',
            name: 'var0',
            meta: {
              type: 'number',
            },
          },
        ],
        data: dataMock,
        lensSuggestionsApi: jest.fn(() => allSuggestionsMock),
      });
    });
    const current = result.current;
    expect(current).toStrictEqual({
      allSuggestions: allSuggestionsMock,
      currentSuggestion: allSuggestionsMock[0],
      isOnHistogramMode: false,
      histogramQuery: undefined,
      suggestionUnsupported: false,
    });
  });

  test('should return suggestionUnsupported if no timerange is provided and no suggestions returned by the api', async () => {
    const { result } = renderHook(() => {
      return useLensSuggestions({
        dataView: dataViewMock,
        query: { esql: 'from the-data-view | stats maxB = max(bytes)' },
        isPlainRecord: true,
        columns: [
          {
            id: 'var0',
            name: 'var0',
            meta: {
              type: 'number',
            },
          },
        ],
        data: dataMock,
        lensSuggestionsApi: jest.fn(),
      });
    });
    const current = result.current;
    expect(current).toStrictEqual({
      allSuggestions: [],
      currentSuggestion: undefined,
      isOnHistogramMode: false,
      histogramQuery: undefined,
      suggestionUnsupported: true,
    });
  });

  test('should return histogramSuggestion if no suggestions returned by the api', async () => {
    const firstMockReturn = undefined;
    const secondMockReturn = allSuggestionsMock;
    const lensSuggestionsApi = jest
      .fn()
      .mockReturnValueOnce(firstMockReturn) // will return to firstMockReturn object firstly
      .mockReturnValueOnce(secondMockReturn); // will return to secondMockReturn object secondly

    const { result } = renderHook(() => {
      return useLensSuggestions({
        dataView: dataViewMock,
        query: { esql: 'from the-data-view | limit 100' },
        isPlainRecord: true,
        columns: [
          {
            id: 'var0',
            name: 'var0',
            meta: {
              type: 'number',
            },
          },
        ],
        data: dataMock,
        lensSuggestionsApi,
        timeRange: {
          from: '2023-09-03T08:00:00.000Z',
          to: '2023-09-04T08:56:28.274Z',
        },
      });
    });
    const current = result.current;
    expect(current).toStrictEqual({
      allSuggestions: [],
      currentSuggestion: allSuggestionsMock[0],
      isOnHistogramMode: true,
      histogramQuery: {
        esql: 'from the-data-view | limit 100 | EVAL timestamp=DATE_TRUNC(30 minute, @timestamp) | stats results = count(*) by timestamp | rename timestamp as `@timestamp every 30 minute`',
      },
      suggestionUnsupported: false,
    });
  });

  test('should return histogramSuggestion even if the ESQL query contains a DROP @timestamp statement', async () => {
    const firstMockReturn = undefined;
    const secondMockReturn = allSuggestionsMock;
    const lensSuggestionsApi = jest
      .fn()
      .mockReturnValueOnce(firstMockReturn) // will return to firstMockReturn object firstly
      .mockReturnValueOnce(secondMockReturn); // will return to secondMockReturn object secondly

    renderHook(() => {
      return useLensSuggestions({
        dataView: dataViewMock,
        query: { esql: 'from the-data-view | DROP @timestamp | limit 100' },
        isPlainRecord: true,
        columns: [
          {
            id: 'var0',
            name: 'var0',
            meta: {
              type: 'number',
            },
          },
        ],
        data: dataMock,
        lensSuggestionsApi,
        timeRange: {
          from: '2023-09-03T08:00:00.000Z',
          to: '2023-09-04T08:56:28.274Z',
        },
      });
    });
    expect(lensSuggestionsApi).toHaveBeenLastCalledWith(
      expect.objectContaining({
        query: { esql: expect.stringMatching('from the-data-view | limit 100 ') },
      }),
      expect.anything(),
      ['lnsDatatable']
    );
  });

  test('should not return histogramSuggestion if no suggestions returned by the api and transformational commands', async () => {
    const firstMockReturn = undefined;
    const secondMockReturn = allSuggestionsMock;
    const lensSuggestionsApi = jest
      .fn()
      .mockReturnValueOnce(firstMockReturn) // will return to firstMockReturn object firstly
      .mockReturnValueOnce(secondMockReturn); // will return to secondMockReturn object secondly

    const { result } = renderHook(() => {
      return useLensSuggestions({
        dataView: dataViewMock,
        query: { esql: 'from the-data-view | limit 100 | keep @timestamp' },
        isPlainRecord: true,
        columns: [
          {
            id: 'var0',
            name: 'var0',
            meta: {
              type: 'number',
            },
          },
        ],
        data: dataMock,
        lensSuggestionsApi,
        timeRange: {
          from: '2023-09-03T08:00:00.000Z',
          to: '2023-09-04T08:56:28.274Z',
        },
      });
    });
    const current = result.current;
    expect(current).toStrictEqual({
      allSuggestions: [],
      currentSuggestion: undefined,
      isOnHistogramMode: false,
      histogramQuery: undefined,
      suggestionUnsupported: true,
    });
  });
});
