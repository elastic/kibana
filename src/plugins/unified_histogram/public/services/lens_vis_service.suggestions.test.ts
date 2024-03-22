/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { AggregateQuery, Query } from '@kbn/es-query';
import { deepMockedFields, buildDataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { allSuggestionsMock } from '../__mocks__/suggestions';
import { getLensVisMock } from '../__mocks__/lens_vis';
import { UnifiedHistogramSuggestionType } from '../types';

describe('LensVisService suggestions', () => {
  const dataViewMock = buildDataViewMock({
    name: 'the-data-view',
    fields: deepMockedFields,
    timeFieldName: '@timestamp',
  });

  test('should use a histogram fallback if suggestions are empty for non aggregate query', async () => {
    const query: Query | AggregateQuery = { language: 'kuery', query: 'extension : css' };
    const lensVis = await getLensVisMock({
      filters: [],
      query,
      dataView: dataViewMock,
      timeInterval: 'auto',
      breakdownField: undefined,
      columns: [],
      isPlainRecord: false,
      allSuggestions: [],
    });

    expect(lensVis.currentSuggestionContext?.type).toBe(
      UnifiedHistogramSuggestionType.histogramForDataView
    );
    expect(lensVis.currentSuggestionContext?.suggestion).toBeDefined();
  });

  test('should return suggestions for aggregate query', async () => {
    const lensVis = await getLensVisMock({
      filters: [],
      query: { esql: 'from the-data-view | stats maxB = max(bytes)' },
      dataView: dataViewMock,
      timeInterval: 'auto',
      breakdownField: undefined,
      columns: [
        {
          id: 'var0',
          name: 'var0',
          meta: {
            type: 'number',
          },
        },
      ],
      isPlainRecord: true,
      allSuggestions: allSuggestionsMock,
    });

    expect(lensVis.currentSuggestionContext?.type).toBe(
      UnifiedHistogramSuggestionType.lensSuggestion
    );
    expect(lensVis.currentSuggestionContext?.suggestion).toBe(allSuggestionsMock[0]);
  });

  test('should return suggestionUnsupported if no timerange is provided and no suggestions returned by the api', async () => {
    const lensVis = await getLensVisMock({
      filters: [],
      query: { esql: 'from the-data-view | stats maxB = max(bytes)' },
      dataView: dataViewMock,
      timeInterval: 'auto',
      timeRange: null,
      breakdownField: undefined,
      columns: [
        {
          id: 'var0',
          name: 'var0',
          meta: {
            type: 'number',
          },
        },
      ],
      isPlainRecord: true,
      allSuggestions: [],
      hasHistogramSuggestionForESQL: false,
    });

    expect(lensVis.currentSuggestionContext?.type).toBe(UnifiedHistogramSuggestionType.unsupported);
    expect(lensVis.currentSuggestionContext?.suggestion).not.toBeDefined();
  });

  test('should return histogramSuggestion if no suggestions returned by the api', async () => {
    const lensVis = await getLensVisMock({
      filters: [],
      query: { esql: 'from the-data-view | limit 100' },
      dataView: dataViewMock,
      timeInterval: 'auto',
      timeRange: {
        from: '2023-09-03T08:00:00.000Z',
        to: '2023-09-04T08:56:28.274Z',
      },
      breakdownField: undefined,
      columns: [
        {
          id: 'var0',
          name: 'var0',
          meta: {
            type: 'number',
          },
        },
      ],
      isPlainRecord: true,
      allSuggestions: [],
      hasHistogramSuggestionForESQL: true,
    });

    expect(lensVis.currentSuggestionContext?.type).toBe(
      UnifiedHistogramSuggestionType.histogramForESQL
    );
    expect(lensVis.currentSuggestionContext?.suggestion).toBeDefined();

    const histogramQuery = {
      esql: 'from the-data-view | limit 100 | EVAL timestamp=DATE_TRUNC(30 minute, @timestamp) | stats results = count(*) by timestamp | rename timestamp as `@timestamp every 30 minute`',
    };

    expect(lensVis.visContext?.attributes.state.query).toStrictEqual(histogramQuery);
  });

  test('should return histogramSuggestion even if the ESQL query contains a DROP @timestamp statement', async () => {
    const lensVis = await getLensVisMock({
      filters: [],
      query: { esql: 'from the-data-view | DROP @timestamp | limit 100' },
      dataView: dataViewMock,
      timeInterval: 'auto',
      timeRange: {
        from: '2023-09-03T08:00:00.000Z',
        to: '2023-09-04T08:56:28.274Z',
      },
      breakdownField: undefined,
      columns: [
        {
          id: 'var0',
          name: 'var0',
          meta: {
            type: 'number',
          },
        },
      ],
      isPlainRecord: true,
      allSuggestions: [],
      hasHistogramSuggestionForESQL: true,
    });

    expect(lensVis.currentSuggestionContext?.type).toBe(
      UnifiedHistogramSuggestionType.histogramForESQL
    );
    expect(lensVis.currentSuggestionContext?.suggestion).toBeDefined();

    const histogramQuery = {
      esql: 'from the-data-view | limit 100 | EVAL timestamp=DATE_TRUNC(30 minute, @timestamp) | stats results = count(*) by timestamp | rename timestamp as `@timestamp every 30 minute`',
    };

    expect(lensVis.visContext?.attributes.state.query).toStrictEqual(histogramQuery);
  });

  test('should not return histogramSuggestion if no suggestions returned by the api and transformational commands', async () => {
    const lensVis = await getLensVisMock({
      filters: [],
      query: { esql: 'from the-data-view | limit 100 | keep @timestamp' },
      dataView: dataViewMock,
      timeInterval: 'auto',
      timeRange: {
        from: '2023-09-03T08:00:00.000Z',
        to: '2023-09-04T08:56:28.274Z',
      },
      breakdownField: undefined,
      columns: [
        {
          id: 'var0',
          name: 'var0',
          meta: {
            type: 'number',
          },
        },
      ],
      isPlainRecord: true,
      allSuggestions: [],
      hasHistogramSuggestionForESQL: true,
    });

    expect(lensVis.currentSuggestionContext?.type).toBe(UnifiedHistogramSuggestionType.unsupported);
    expect(lensVis.currentSuggestionContext?.suggestion).not.toBeDefined();
  });
});
