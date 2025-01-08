/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { XYLayerConfig } from '@kbn/visualizations-plugin/common/convert_to_lens';
import { METRIC_TYPES } from '@kbn/data-plugin/public';
import type { Panel, Metric } from '../../../../../common/types';
import { TSVB_METRIC_TYPES } from '../../../../../common/enums';
import {
  Layer,
  PercentileColumnWithExtendedMeta,
  PercentileRanksColumnWithCommonMeta,
} from '../../convert';
import { getLayers } from './layers';
import { createPanel, createSeries } from '../../__mocks__';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';

const mockExtractOrGenerateDatasourceInfo = jest.fn();

jest.mock('uuid', () => ({
  v4: () => 'test-id',
}));

jest.mock('../../datasource', () => ({
  extractOrGenerateDatasourceInfo: jest.fn(() => mockExtractOrGenerateDatasourceInfo()),
}));

const mockedIndices = [
  {
    id: 'test',
    title: 'test',
    timeFieldName: 'test_field',
    getFieldByName: (name: string) => ({ aggregatable: name !== 'host' }),
  },
  {
    id: 'test2',
    title: 'test2',
    timeFieldName: 'test_field',
    getFieldByName: (name: string) => ({ aggregatable: name !== 'host' }),
  },
] as unknown as DataView[];

const indexPatternsService = {
  getDefault: jest.fn(() =>
    Promise.resolve({
      id: 'default',
      title: 'index',
      getFieldByName: (name: string) => ({ aggregatable: name !== 'host' }),
    })
  ),
  get: jest.fn((id) => Promise.resolve({ ...mockedIndices[0], id })),
  find: jest.fn((search: string, size: number) => {
    if (size !== 1) {
      // shouldn't request more than one data view since there is a significant performance penalty
      throw new Error('trying to fetch too many data views');
    }
    return Promise.resolve(mockedIndices || []);
  }),
} as unknown as DataViewsPublicPluginStart;

describe('getLayers', () => {
  const dataSourceLayers: Record<number, Layer> = [
    {
      indexPatternId: 'test',
      layerId: 'test-layer-1',
      ignoreGlobalFilters: false,
      columns: [
        {
          operationType: 'count',
          columnId: 'column-id-1',
          sourceField: 'document',
          isBucketed: false,
          isSplit: false,
          dataType: 'number',
          params: {},
          meta: { metricId: 'metric-1' },
        },
        {
          columnId: 'column-id-2',
          operationType: 'date_histogram',
          isBucketed: true,
          isSplit: false,
          sourceField: 'date-field',
          dataType: 'date',
          params: {
            interval: 'auto',
          },
        },
        {
          columnId: 'column-id-3',
          operationType: 'terms',
          isBucketed: true,
          isSplit: true,
          sourceField: 'string-field',
          dataType: 'string',
          params: {
            size: 5,
            orderBy: { type: 'alphabetical' },
            orderDirection: 'desc',
          },
        },
      ],
      columnOrder: [],
    },
  ];
  const dataSourceLayersWithStatic: Record<number, Layer> = [
    {
      indexPatternId: 'test',
      layerId: 'test-layer-1',
      ignoreGlobalFilters: false,
      columns: [
        {
          operationType: 'static_value',
          columnId: 'column-id-1',
          isBucketed: false,
          isSplit: false,
          dataType: 'number',
          references: [],
          params: {
            value: '100',
          },
        },
      ],
      columnOrder: [],
    },
  ];
  const dataSourceLayersWithPercentile: Record<number, Layer> = [
    {
      indexPatternId: 'test',
      layerId: 'test-layer-1',
      ignoreGlobalFilters: false,
      columns: [
        {
          operationType: 'percentile',
          columnId: 'column-id-1',
          sourceField: 'test-field',
          isBucketed: false,
          isSplit: false,
          dataType: 'number',
          params: {
            percentile: 50,
          },
          meta: { metricId: 'metric-1', reference: 'metric-1.0' },
        } as PercentileColumnWithExtendedMeta,
        {
          operationType: 'percentile',
          columnId: 'column-id-2',
          sourceField: 'test-field',
          isBucketed: false,
          isSplit: false,
          dataType: 'number',
          params: {
            percentile: 100,
          },
          meta: { metricId: 'metric-1', reference: 'metric-1.1' },
        } as PercentileColumnWithExtendedMeta,
      ],
      columnOrder: [],
    },
  ];
  const dataSourceLayersWithPercentileRank: Record<number, Layer> = [
    {
      indexPatternId: 'test',
      layerId: 'test-layer-1',
      ignoreGlobalFilters: false,
      columns: [
        {
          operationType: 'percentile_rank',
          columnId: 'column-id-1',
          sourceField: 'test-field',
          isBucketed: false,
          isSplit: false,
          dataType: 'number',
          params: {
            value: 50,
          },
          meta: { metricId: 'metric-1', reference: 'metric-1.0' },
        } as PercentileRanksColumnWithCommonMeta,
        {
          operationType: 'percentile_rank',
          columnId: 'column-id-2',
          sourceField: 'test-field',
          isBucketed: false,
          isSplit: false,
          dataType: 'number',
          params: {
            value: 100,
          },
          meta: { metricId: 'metric-1', reference: 'metric-1.1' },
        } as PercentileRanksColumnWithCommonMeta,
      ],
      columnOrder: [],
    },
  ];
  const metrics = [
    {
      id: 'metric-1',
      type: METRIC_TYPES.COUNT,
    },
  ];

  const staticValueMetric = [
    {
      id: 'metric-1',
      type: TSVB_METRIC_TYPES.STATIC,
    },
  ];

  const percentileMetrics = [
    {
      id: 'metric-1',
      type: TSVB_METRIC_TYPES.PERCENTILE,
      percentiles: [
        {
          id: 'percent-1',
          mode: 'line' as const,
          color: 'color-1',
        },
        {
          id: 'percent-2',
          mode: 'line' as const,
          color: 'color-2',
        },
      ],
    },
  ] as Metric[];

  const percentileRankMetrics = [
    {
      id: 'metric-1',
      type: TSVB_METRIC_TYPES.PERCENTILE_RANK,
      colors: ['color-1', 'color-2'],
    },
  ];

  const panel = createPanel({ series: [createSeries({ metrics })] });
  const panelWithStaticValue = createPanel({
    series: [createSeries({ metrics: staticValueMetric })],
  });
  const panelWithPercentileMetric = createPanel({
    series: [createSeries({ metrics: percentileMetrics })],
  });
  const panelWithPercentileRankMetric = createPanel({
    series: [createSeries({ metrics: percentileRankMetrics })],
  });
  const panelWithSingleAnnotation = createPanel({
    annotations: [
      {
        fields: 'geo.src,host',
        template: 'Security Error from {{geo.src}} on {{host}}',
        query_string: {
          query: 'tags:error AND tags:security',
          language: 'lucene',
        },
        id: 'ann1',
        color: 'rgba(211,49,21,0.7)',
        time_field: 'timestamp',
        icon: 'fa-asterisk',
        ignore_global_filters: 1,
        ignore_panel_filters: 1,
        hidden: true,
        index_pattern: {
          id: 'test',
        },
      },
    ],
    series: [createSeries({ metrics: staticValueMetric })],
  });

  const panelWithSingleAnnotationWithoutQueryStringAndTimefield = createPanel({
    annotations: [
      {
        fields: 'geo.src,host',
        template: 'Security Error from {{geo.src}} on {{host}}',
        id: 'ann1',
        color: 'rgba(211,49,21,0.7)',
        icon: 'fa-asterisk',
        ignore_global_filters: 1,
        ignore_panel_filters: 1,
        time_field: '',
        query_string: {
          query: '',
          language: 'lucene',
        },
        hidden: true,
        index_pattern: {
          id: 'test',
        },
      },
    ],
    series: [createSeries({ metrics: staticValueMetric })],
  });

  const panelWithMultiAnnotations = createPanel({
    annotations: [
      {
        fields: 'geo.src,host',
        template: 'Security Error from {{geo.src}} on {{host}}',
        query_string: {
          query: 'tags:error AND tags:security',
          language: 'lucene',
        },
        id: 'ann1',
        color: 'rgba(211,49,21,0.7)',
        time_field: 'timestamp',
        icon: 'fa-asterisk',
        ignore_global_filters: 1,
        ignore_panel_filters: 1,
        hidden: true,
        index_pattern: {
          id: 'test',
        },
      },
      {
        query_string: {
          query: 'tags: error AND tags: security',
          language: 'kql',
        },
        id: 'ann2',
        color: 'blue',
        time_field: 'timestamp',
        icon: 'error-icon',
        ignore_global_filters: 0, // todo test ignore when PR is r
        ignore_panel_filters: 0,
        index_pattern: {
          id: 'test',
        },
      },
      {
        fields: 'category.keyword,price',
        template: 'Will be ignored',
        query_string: {
          query: 'category.keyword:*',
          language: 'kql',
        },
        id: 'ann3',
        color: 'red',
        time_field: 'order_date',
        icon: undefined,
        ignore_global_filters: 1,
        ignore_panel_filters: 1,
        index_pattern: {
          id: 'test2',
        },
      },
    ],
    series: [createSeries({ metrics: staticValueMetric })],
  });
  const panelWithSingleAnnotationDefaultDataView = createPanel({
    annotations: [
      {
        fields: 'geo.src,host',
        template: 'Security Error from {{geo.src}} on {{host}}',
        query_string: {
          query: 'tags:error AND tags:security',
          language: 'lucene',
        },
        id: 'ann1',
        color: 'rgba(211,49,21,0.7)',
        time_field: 'timestamp',
        icon: 'fa-asterisk',
        ignore_global_filters: 1,
        ignore_panel_filters: 1,
        hidden: true,
        index_pattern: '',
      },
    ],
    series: [createSeries({ metrics: staticValueMetric })],
  });
  beforeEach(() => {
    jest.clearAllMocks();
    mockExtractOrGenerateDatasourceInfo.mockReturnValue({
      indexPattern: mockedIndices[0],
      indexPatternId: mockedIndices[0].id,
      timeField: mockedIndices[0].timeFieldName,
    });
  });

  test.each<
    [
      string,
      [Record<number, Layer>, Panel, DataViewsPublicPluginStart, boolean],
      Array<Partial<XYLayerConfig>>
    ]
  >([
    [
      'data layer if columns do not include static column',
      [dataSourceLayers, panel, indexPatternsService, false],
      [
        {
          layerType: 'data',
          accessors: ['column-id-1'],
          xAccessor: 'column-id-2',
          splitAccessor: 'column-id-3',
          seriesType: 'area',
          layerId: 'test-layer-1',
          yConfig: [
            {
              forAccessor: 'column-id-1',
              axisMode: 'right',
              color: '#68BC00',
            },
          ],
        },
      ],
    ],
    [
      'data layer with "left" axisMode if isSingleAxis is provided',
      [dataSourceLayers, panel, indexPatternsService, true],
      [
        {
          layerType: 'data',
          accessors: ['column-id-1'],
          xAccessor: 'column-id-2',
          splitAccessor: 'column-id-3',
          seriesType: 'area',
          layerId: 'test-layer-1',
          yConfig: [
            {
              forAccessor: 'column-id-1',
              axisMode: 'left',
              color: '#68BC00',
            },
          ],
        },
      ],
    ],
    [
      'reference line layer if columns include static column',
      [dataSourceLayersWithStatic, panelWithStaticValue, indexPatternsService, false],
      [
        {
          layerType: 'referenceLine',
          accessors: ['column-id-1'],
          layerId: 'test-layer-1',
          yConfig: [
            {
              forAccessor: 'column-id-1',
              axisMode: 'left',
              color: '#68BC00',
              fill: 'below',
              lineWidth: 1,
            },
          ],
        },
      ],
    ],
    [
      'correct colors if columns include percentile columns',
      [dataSourceLayersWithPercentile, panelWithPercentileMetric, indexPatternsService, false],
      [
        {
          yConfig: [
            {
              forAccessor: 'column-id-1',
              axisMode: 'right',
              color: 'color-1',
            },
            {
              forAccessor: 'column-id-2',
              axisMode: 'right',
              color: 'color-2',
            },
          ],
        },
      ],
    ],
    [
      'correct colors if columns include percentile rank columns',
      [
        dataSourceLayersWithPercentileRank,
        panelWithPercentileRankMetric,
        indexPatternsService,
        false,
      ],
      [
        {
          yConfig: [
            {
              forAccessor: 'column-id-1',
              axisMode: 'right',
              color: 'color-1',
            },
            {
              forAccessor: 'column-id-2',
              axisMode: 'right',
              color: 'color-2',
            },
          ],
        },
      ],
    ],
    [
      'annotation layer gets correct params and converts color, extraFields and icons',
      [dataSourceLayersWithStatic, panelWithSingleAnnotation, indexPatternsService, false],
      [
        {
          layerType: 'referenceLine',
          accessors: ['column-id-1'],
          layerId: 'test-layer-1',
          yConfig: [
            {
              forAccessor: 'column-id-1',
              axisMode: 'left',
              color: '#68BC00',
              fill: 'below',
              lineWidth: 1,
            },
          ],
        },
        {
          layerId: 'test-id',
          layerType: 'annotations',
          ignoreGlobalFilters: true,
          annotations: [
            {
              color: '#D33115',
              extraFields: ['geo.src'],
              filter: {
                language: 'lucene',
                query: 'tags:error AND tags:security',
                type: 'kibana_query',
              },
              icon: 'asterisk',
              id: 'ann1',
              isHidden: true,
              key: {
                type: 'point_in_time',
              },
              label: 'Event',
              timeField: 'timestamp',
              type: 'query',
            },
          ],
          indexPatternId: 'test',
        },
      ],
    ],
    [
      'annotation layer should gets correct default params',
      [
        dataSourceLayersWithStatic,
        panelWithSingleAnnotationWithoutQueryStringAndTimefield,
        indexPatternsService,
        false,
      ],
      [
        {
          layerType: 'referenceLine',
          accessors: ['column-id-1'],
          layerId: 'test-layer-1',
          yConfig: [
            {
              forAccessor: 'column-id-1',
              axisMode: 'left',
              color: '#68BC00',
              fill: 'below',
              lineWidth: 1,
            },
          ],
        },
        {
          layerId: 'test-id',
          layerType: 'annotations',
          ignoreGlobalFilters: true,
          annotations: [
            {
              color: '#D33115',
              extraFields: ['geo.src'],
              filter: {
                language: 'lucene',
                query: '*',
                type: 'kibana_query',
              },
              icon: 'asterisk',
              id: 'ann1',
              isHidden: true,
              key: {
                type: 'point_in_time',
              },
              label: 'Event',
              timeField: 'test_field',
              type: 'query',
            },
          ],
          indexPatternId: 'test',
        },
      ],
    ],
  ])('should return %s', async (_, input, expected) => {
    const layers = await getLayers(...input);
    expect(layers).toEqual(expected.map(expect.objectContaining));
  });

  test('should return multiple annotations with different data views create separate layers', async () => {
    mockExtractOrGenerateDatasourceInfo.mockReturnValueOnce({
      indexPattern: mockedIndices[0],
      indexPatternId: mockedIndices[0].id,
      timeField: mockedIndices[0].timeFieldName,
    });
    mockExtractOrGenerateDatasourceInfo.mockReturnValueOnce({
      indexPattern: mockedIndices[1],
      indexPatternId: mockedIndices[1].id,
      timeField: mockedIndices[1].timeFieldName,
    });

    const layers = await getLayers(
      dataSourceLayersWithStatic,
      panelWithMultiAnnotations,
      indexPatternsService,
      false
    );

    expect(layers).toEqual(
      [
        {
          layerType: 'referenceLine',
          accessors: ['column-id-1'],
          layerId: 'test-layer-1',
          yConfig: [
            {
              forAccessor: 'column-id-1',
              axisMode: 'left',
              color: '#68BC00',
              fill: 'below',
              lineWidth: 1,
            },
          ],
        },
        {
          layerId: 'test-id',
          layerType: 'annotations',
          ignoreGlobalFilters: true,
          annotations: [
            {
              color: '#D33115',
              extraFields: ['geo.src'],
              filter: {
                language: 'lucene',
                query: 'tags:error AND tags:security',
                type: 'kibana_query',
              },
              icon: 'asterisk',
              id: 'ann1',
              isHidden: true,
              key: {
                type: 'point_in_time',
              },
              label: 'Event',
              timeField: 'timestamp',
              type: 'query',
            },
          ],
          indexPatternId: 'test',
        },
        {
          layerId: 'test-id',
          layerType: 'annotations',
          ignoreGlobalFilters: false,
          annotations: [
            {
              color: '#0000FF',
              filter: {
                language: 'kql',
                query: 'tags: error AND tags: security',
                type: 'kibana_query',
              },
              icon: 'triangle',
              id: 'ann2',
              key: {
                type: 'point_in_time',
              },
              label: 'Event',
              timeField: 'timestamp',
              type: 'query',
            },
          ],
          indexPatternId: 'test2',
        },
        {
          layerId: 'test-id',
          layerType: 'annotations',
          ignoreGlobalFilters: true,
          annotations: [
            {
              color: '#FF0000',
              extraFields: ['category.keyword', 'price'],
              filter: {
                language: 'kql',
                query: 'category.keyword:*',
                type: 'kibana_query',
              },
              icon: 'triangle',
              id: 'ann3',
              key: {
                type: 'point_in_time',
              },
              label: 'Event',
              timeField: 'order_date',
              type: 'query',
            },
          ],
          indexPatternId: 'test',
        },
      ].map(expect.objectContaining)
    );
    expect(mockExtractOrGenerateDatasourceInfo).toBeCalledTimes(3);
  });

  test('should return annotation layer gets correct dataView when none is defined', async () => {
    mockExtractOrGenerateDatasourceInfo.mockReturnValue({
      indexPattern: { ...mockedIndices[0], id: 'default' },
      indexPatternId: 'default',
      timeField: mockedIndices[0].timeFieldName,
    });

    const layers = await getLayers(
      dataSourceLayersWithStatic,
      panelWithSingleAnnotationDefaultDataView,
      indexPatternsService,
      false
    );

    expect(layers).toEqual(
      [
        {
          layerType: 'referenceLine',
          accessors: ['column-id-1'],
          layerId: 'test-layer-1',
          yConfig: [
            {
              forAccessor: 'column-id-1',
              axisMode: 'left',
              color: '#68BC00',
              fill: 'below',
              lineWidth: 1,
            },
          ],
        },
        {
          layerId: 'test-id',
          layerType: 'annotations',
          ignoreGlobalFilters: true,
          annotations: [
            {
              color: '#D33115',
              extraFields: ['geo.src'],
              filter: {
                language: 'lucene',
                query: 'tags:error AND tags:security',
                type: 'kibana_query',
              },
              icon: 'asterisk',
              id: 'ann1',
              isHidden: true,
              key: {
                type: 'point_in_time',
              },
              label: 'Event',
              timeField: 'timestamp',
              type: 'query',
            },
          ],
          indexPatternId: 'default',
        },
      ].map(expect.objectContaining)
    );
    expect(mockExtractOrGenerateDatasourceInfo).toBeCalledTimes(1);
  });
});
