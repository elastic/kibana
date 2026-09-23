/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getRepresentativeQuery } from '@kbn/lens-common';
import type { AggregateQuery, Query } from '@kbn/es-query';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import { deepMockedFields, buildDataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { allSuggestionsMock } from '../__mocks__/suggestions';
import { getLensVisMock } from '../__mocks__/lens_vis';
import { convertDatatableColumnToDataViewFieldSpec } from '@kbn/data-view-utils';
import { UnifiedHistogramSuggestionType, type UnifiedHistogramVisContext } from '../types';

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
      isTransformationalESQL: true,
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
      isTransformationalESQL: false,
    });

    expect(lensVis.currentSuggestionContext?.type).toBe(
      UnifiedHistogramSuggestionType.histogramForESQL
    );
    expect(lensVis.currentSuggestionContext?.suggestion).toBeDefined();

    const histogramQuery = {
      esql: `from the-data-view | limit 100
| STATS results = COUNT(*) BY timestamp = BUCKET(@timestamp, 30 minute)`,
    };

    expect(getRepresentativeQuery(lensVis.visContext?.attributes)).toStrictEqual(histogramQuery);
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
      isTransformationalESQL: false,
    });

    expect(lensVis.currentSuggestionContext?.type).toBe(
      UnifiedHistogramSuggestionType.histogramForESQL
    );
    expect(lensVis.currentSuggestionContext?.suggestion).toBeDefined();

    const histogramQuery = {
      esql: `from the-data-view | limit 100
| STATS results = COUNT(*) BY timestamp = BUCKET(@timestamp, 30 minute)`,
    };

    expect(getRepresentativeQuery(lensVis.visContext?.attributes)).toStrictEqual(histogramQuery);
  });

  test('should return histogramSuggestion with FROM for a timeseries user query', async () => {
    const lensVis = await getLensVisMock({
      filters: [],
      query: { esql: 'TS metrics*' },
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
      isTransformationalESQL: false,
    });

    expect(lensVis.currentSuggestionContext?.type).toBe(
      UnifiedHistogramSuggestionType.histogramForESQL
    );
    expect(lensVis.currentSuggestionContext?.suggestion).toBeDefined();

    const histogramQuery = {
      esql: `FROM metrics*
| STATS results = COUNT(*) BY timestamp = BUCKET(@timestamp, 30 minute)`,
    };

    expect(getRepresentativeQuery(lensVis.visContext?.attributes)).toStrictEqual(histogramQuery);
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
      isTransformationalESQL: true,
    });

    expect(lensVis.currentSuggestionContext?.type).toBe(UnifiedHistogramSuggestionType.unsupported);
    expect(lensVis.currentSuggestionContext?.suggestion).not.toBeDefined();
  });

  test('should not append histogram for METRICS_INFO command queries', async () => {
    const lensVis = await getLensVisMock({
      filters: [],
      query: { esql: 'TS metrics-* | METRICS_INFO | LIMIT 100' },
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
      isTransformationalESQL: false,
    });

    expect(lensVis.currentSuggestionContext?.type).toBe(UnifiedHistogramSuggestionType.unsupported);
    expect(lensVis.currentSuggestionContext?.suggestion).not.toBeDefined();
  });

  test('should not append histogram for TS_INFO command queries', async () => {
    const lensVis = await getLensVisMock({
      filters: [],
      query: { esql: 'TS metrics-* | TS_INFO | LIMIT 100' },
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
      isTransformationalESQL: false,
    });

    expect(lensVis.currentSuggestionContext?.type).toBe(UnifiedHistogramSuggestionType.unsupported);
    expect(lensVis.currentSuggestionContext?.suggestion).not.toBeDefined();
  });

  test('should return histogramSuggestion if no suggestions returned by the api with the breakdown field if it is given', async () => {
    const breakdown = convertDatatableColumnToDataViewFieldSpec({
      name: 'var0',
      id: 'var0',
      meta: { type: 'number' },
    });
    const lensVis = await getLensVisMock({
      filters: [],
      query: { esql: 'from the-data-view | limit 100' },
      dataView: dataViewMock,
      timeInterval: 'auto',
      timeRange: {
        from: '2023-09-03T08:00:00.000Z',
        to: '2023-09-04T08:56:28.274Z',
      },
      breakdownField: breakdown as DataViewField,
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
      isTransformationalESQL: false,
    });

    expect(lensVis.currentSuggestionContext?.type).toBe(
      UnifiedHistogramSuggestionType.histogramForESQL
    );
    expect(lensVis.currentSuggestionContext?.suggestion).toBeDefined();
    expect(lensVis.currentSuggestionContext?.suggestion?.visualizationState).toHaveProperty(
      'layers',
      [
        {
          layerId: '662552df-2cdc-4539-bf3b-73b9f827252c',
          seriesType: 'bar_stacked',
          xAccessor: '@timestamp every 30 second',
          accessors: ['results'],
          layerType: 'data',
          splitAccessors: ['var0'],
        },
      ]
    );

    const histogramQuery = {
      esql: `from the-data-view | limit 100
| STATS results = COUNT(*) BY \`var0\`, timestamp = BUCKET(@timestamp, 30 minute) | sort \`var0\` asc`,
    };

    expect(getRepresentativeQuery(lensVis.visContext?.attributes)).toStrictEqual(histogramQuery);
  });

  test('should return histogramSuggestion even if suggestions returned by the api', async () => {
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
      allSuggestions: allSuggestionsMock,
      isTransformationalESQL: false,
    });

    expect(lensVis.currentSuggestionContext?.type).toBe(
      UnifiedHistogramSuggestionType.histogramForESQL
    );
    expect(lensVis.currentSuggestionContext?.suggestion).toBeDefined();
  });

  test('should return histogramSuggestion if no suggestions returned by the api with a geo point breakdown field correctly', async () => {
    const lensVis = await getLensVisMock({
      filters: [],
      query: { esql: 'from the-data-view | limit 100' },
      dataView: dataViewMock,
      timeInterval: 'auto',
      timeRange: {
        from: '2023-09-03T08:00:00.000Z',
        to: '2023-09-04T08:56:28.274Z',
      },
      breakdownField: { name: 'coordinates' } as DataViewField,
      columns: [
        {
          id: 'coordinates',
          name: 'coordinates',
          meta: {
            type: 'geo_point',
          },
        },
      ],
      isPlainRecord: true,
      allSuggestions: [],
      isTransformationalESQL: false,
    });

    expect(lensVis.currentSuggestionContext?.type).toBe(
      UnifiedHistogramSuggestionType.histogramForESQL
    );
    expect(lensVis.currentSuggestionContext?.suggestion).toBeDefined();
    expect(lensVis.currentSuggestionContext?.suggestion?.visualizationState).toHaveProperty(
      'layers',
      [
        {
          layerId: '662552df-2cdc-4539-bf3b-73b9f827252c',
          seriesType: 'bar_stacked',
          xAccessor: '@timestamp every 30 second',
          accessors: ['results'],
          layerType: 'data',
        },
      ]
    );

    const histogramQuery = {
      esql: `from the-data-view | limit 100
| STATS results = COUNT(*) BY \`coordinates\`, timestamp = BUCKET(@timestamp, 30 minute)`,
    };

    expect(getRepresentativeQuery(lensVis.visContext?.attributes)).toStrictEqual(histogramQuery);
  });

  test('should keep a customized ES|QL histogram when only a compatible query clause changes', async () => {
    const onLensSuggestionsApiCall = jest.fn();
    const externalVisContext = {
      suggestionType: UnifiedHistogramSuggestionType.histogramForESQL,
      requestData: {
        dataViewId: 'esql-old',
        timeField: '@timestamp',
        timeInterval: undefined,
        breakdownField: undefined,
      },
      attributes: {
        title: 'Line',
        visualizationType: 'lnsXY',
        state: {
          visualization: { preferredSeriesType: 'line' },
          datasourceStates: {
            textBased: {
              layers: {
                layer1: {
                  index: 'esql-old',
                  timeField: '@timestamp',
                  query: {
                    esql: 'from the-data-view | limit 10 | STATS results = COUNT(*) BY timestamp = BUCKET(@timestamp, 30 minute)',
                  },
                },
              },
            },
          },
        },
      },
    } as unknown as UnifiedHistogramVisContext;

    await getLensVisMock({
      filters: [],
      query: { esql: 'from the-data-view | limit 100' },
      dataView: dataViewMock,
      timeInterval: 'auto',
      timeRange: {
        from: '2023-09-03T08:00:00.000Z',
        to: '2023-09-04T08:56:28.274Z',
      },
      breakdownField: undefined,
      columns: [],
      isPlainRecord: true,
      allSuggestions: [],
      isTransformationalESQL: false,
      externalVisContext,
      onLensSuggestionsApiCall,
    });

    expect(onLensSuggestionsApiCall).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        title: 'Line',
        state: expect.objectContaining({
          datasourceStates: expect.objectContaining({
            textBased: expect.objectContaining({
              layers: {
                layer1: expect.objectContaining({
                  index: dataViewMock.id,
                }),
              },
            }),
          }),
        }),
      })
    );
  });

  test('should keep a customized ES|QL Line histogram when EsqlSource.datasetKey is unchanged', async () => {
    const externalVisContext = {
      suggestionType: UnifiedHistogramSuggestionType.histogramForESQL,
      requestData: {
        dataViewId: 'esql:the-data-view:@timestamp:',
        timeField: '@timestamp',
        timeInterval: undefined,
        breakdownField: undefined,
      },
      attributes: {
        title: 'Line',
        visualizationType: 'lnsXY',
        state: {
          visualization: { preferredSeriesType: 'line' },
          datasourceStates: {
            textBased: {
              layers: {
                layer1: {
                  index: 'esql-old',
                  timeField: '@timestamp',
                  query: {
                    esql: 'from the-data-view | limit 10 | STATS results = COUNT(*) BY timestamp = BUCKET(@timestamp, 30 minute)',
                  },
                },
              },
            },
          },
        },
      },
    } as unknown as UnifiedHistogramVisContext;

    const lensVis = await getLensVisMock({
      filters: [],
      query: { esql: 'from the-data-view | limit 10' },
      dataView: dataViewMock,
      timeInterval: 'auto',
      timeRange: {
        from: '2023-09-03T08:00:00.000Z',
        to: '2023-09-04T08:56:28.274Z',
      },
      breakdownField: undefined,
      columns: [],
      isPlainRecord: true,
      allSuggestions: [],
      isTransformationalESQL: false,
      externalVisContext,
    });

    expect(dataViewMock.id).not.toBe('esql:the-data-view:@timestamp:');
    expect(lensVis.visContext?.requestData.dataViewId).toBe('esql:the-data-view:@timestamp:');
    expect(lensVis.visContext?.attributes.title).toBe('Line');
  });

  test('should drop a customized ES|QL Line histogram when the FROM index pattern changes', async () => {
    const histogramQuery = {
      esql: `from logs* | limit 10
| STATS results = COUNT(*) BY timestamp = BUCKET(@timestamp, 30 minute)`,
    };
    const externalVisContext = {
      suggestionType: UnifiedHistogramSuggestionType.histogramForESQL,
      requestData: {
        dataViewId: 'esql:logstash-*:@timestamp:',
        timeField: '@timestamp',
        timeInterval: undefined,
        breakdownField: undefined,
      },
      attributes: {
        title: 'Line',
        visualizationType: 'lnsXY',
        state: {
          query: histogramQuery,
          visualization: { preferredSeriesType: 'line' },
          datasourceStates: {
            textBased: {
              layers: {
                layer1: {
                  index: 'esql-old',
                  timeField: '@timestamp',
                  query: {
                    esql: 'from logstash-* | limit 10 | STATS results = COUNT(*) BY timestamp = BUCKET(@timestamp, 30 minute)',
                  },
                },
              },
            },
          },
        },
      },
    } as unknown as UnifiedHistogramVisContext;

    const lensVis = await getLensVisMock({
      filters: [],
      query: { esql: 'from logs* | limit 10' },
      dataView: dataViewMock,
      timeInterval: 'auto',
      timeRange: {
        from: '2023-09-03T08:00:00.000Z',
        to: '2023-09-04T08:56:28.274Z',
      },
      breakdownField: undefined,
      columns: [],
      isPlainRecord: true,
      allSuggestions: [],
      isTransformationalESQL: false,
      externalVisContext,
    });

    expect(lensVis.visContext?.attributes.title).toBe('Bar');
  });

  test('should drop a customized ES|QL histogram when the index pattern changes', async () => {
    const onLensSuggestionsApiCall = jest.fn();
    const externalVisContext = {
      suggestionType: UnifiedHistogramSuggestionType.histogramForESQL,
      requestData: {
        dataViewId: 'esql-old',
        timeField: '@timestamp',
        timeInterval: undefined,
        breakdownField: undefined,
      },
      attributes: {
        title: 'Line',
        visualizationType: 'lnsXY',
        state: {
          visualization: { preferredSeriesType: 'line' },
          datasourceStates: {
            textBased: {
              layers: {
                layer1: {
                  index: 'esql-old',
                  query: {
                    esql: 'from logstash-* | limit 10 | STATS results = COUNT(*) BY timestamp = BUCKET(@timestamp, 30 minute)',
                  },
                },
              },
            },
          },
        },
      },
    } as unknown as UnifiedHistogramVisContext;

    await getLensVisMock({
      filters: [],
      query: { esql: 'from logs* | limit 100' },
      dataView: dataViewMock,
      timeInterval: 'auto',
      timeRange: {
        from: '2023-09-03T08:00:00.000Z',
        to: '2023-09-04T08:56:28.274Z',
      },
      breakdownField: undefined,
      columns: [],
      isPlainRecord: true,
      allSuggestions: [],
      isTransformationalESQL: false,
      externalVisContext,
      onLensSuggestionsApiCall,
    });

    expect(onLensSuggestionsApiCall).toHaveBeenCalledWith(expect.anything(), undefined);
  });

  test('should drop a customized ES|QL histogram when the time field changes', async () => {
    const onLensSuggestionsApiCall = jest.fn();
    const externalVisContext = {
      suggestionType: UnifiedHistogramSuggestionType.histogramForESQL,
      requestData: {
        dataViewId: 'esql-old',
        timeField: 'event.created',
        timeInterval: undefined,
        breakdownField: undefined,
      },
      attributes: {
        title: 'Line',
        visualizationType: 'lnsXY',
        state: {
          visualization: { preferredSeriesType: 'line' },
          datasourceStates: {
            textBased: {
              layers: {
                layer1: {
                  index: 'esql-old',
                  timeField: 'event.created',
                  query: {
                    esql: 'from the-data-view | limit 10 | STATS results = COUNT(*) BY timestamp = BUCKET(event.created, 30 minute)',
                  },
                },
              },
            },
          },
        },
      },
    } as unknown as UnifiedHistogramVisContext;

    await getLensVisMock({
      filters: [],
      query: { esql: 'from the-data-view | limit 10' },
      dataView: dataViewMock,
      timeInterval: 'auto',
      timeRange: {
        from: '2023-09-03T08:00:00.000Z',
        to: '2023-09-04T08:56:28.274Z',
      },
      breakdownField: undefined,
      columns: [],
      isPlainRecord: true,
      allSuggestions: [],
      isTransformationalESQL: false,
      externalVisContext,
      onLensSuggestionsApiCall,
    });

    expect(onLensSuggestionsApiCall).toHaveBeenCalledWith(expect.anything(), undefined);
  });
});
