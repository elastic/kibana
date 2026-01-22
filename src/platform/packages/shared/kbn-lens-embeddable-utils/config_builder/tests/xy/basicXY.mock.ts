/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  CountIndexPatternColumn,
  DateHistogramIndexPatternColumn,
  FormulaIndexPatternColumn,
  LastValueIndexPatternColumn,
  TermsIndexPatternColumn,
  MathIndexPatternColumn,
  AvgIndexPatternColumn,
} from '@kbn/lens-common';
import type { LensAttributes } from '../../types';

export const minimalAttributesXY: LensAttributes = {
  visualizationType: 'lnsXY',
  title: 'Lens title',
  state: {
    datasourceStates: {
      formBased: {
        layers: {
          '5072f3dd-f0c9-4bfd-a3a4-b9022695c1f4': {
            columnOrder: [
              '315033e2-8172-4213-87e0-d4e7f09ccca7',
              'dc5b22e3-48ef-447d-a0e5-60fdad78cf50',
            ],
            columns: {
              '315033e2-8172-4213-87e0-d4e7f09ccca7': {
                isBucketed: true,
                dataType: 'date',
                label: '@timestamp',
                operationType: 'date_histogram',
                sourceField: '@timestamp',
                params: {
                  interval: 'auto',
                },
              } as DateHistogramIndexPatternColumn,
              'dc5b22e3-48ef-447d-a0e5-60fdad78cf50': {
                isBucketed: false,
                dataType: 'number',
                operationType: 'count',
                sourceField: '___records___',
                label: 'Count of Records',
              },
            },
          },
        },
      },
    },
    visualization: {
      layers: [
        {
          accessors: ['dc5b22e3-48ef-447d-a0e5-60fdad78cf50'],
          isHistogram: true,
          layerId: '5072f3dd-f0c9-4bfd-a3a4-b9022695c1f4',
          layerType: 'data',
          seriesType: 'line',
          xAccessor: '315033e2-8172-4213-87e0-d4e7f09ccca7',
        },
      ],
      legend: {
        isVisible: true,
        position: 'right',
      },
      preferredSeriesType: 'bar_stacked',
    },
    filters: [],
    query: {
      query: '',
      language: 'kuery',
    },
  },
  references: [
    {
      id: 'logs-*',
      name: 'indexpattern-datasource-layer-5072f3dd-f0c9-4bfd-a3a4-b9022695c1f4',
      type: 'index-pattern',
    },
  ],
};

export const fullBasicXY: LensAttributes = {
  type: 'lens',
  visualizationType: 'lnsXY',
  title: 'Lens Title',
  state: {
    adHocDataViews: {},
    datasourceStates: {
      formBased: {
        layers: {
          '5072f3dd-f0c9-4bfd-a3a4-b9022695c1f4': {
            columnOrder: [
              '315033e2-8172-4213-87e0-d4e7f09ccca7',
              'dc5b22e3-48ef-447d-a0e5-60fdad78cf50',
            ],
            columns: {
              '315033e2-8172-4213-87e0-d4e7f09ccca7': {
                customLabel: true,
                dataType: 'date',
                isBucketed: true,
                label: '@timestamp',
                operationType: 'date_histogram',
                params: {
                  dropPartials: false,
                  includeEmptyRows: false,
                  interval: 'auto',
                },
                scale: 'interval',
                sourceField: '@timestamp',
              } as DateHistogramIndexPatternColumn,
              'dc5b22e3-48ef-447d-a0e5-60fdad78cf50': {
                customLabel: true,
                dataType: 'number',
                isBucketed: false,
                label: 'Count',
                operationType: 'count',
                params: {
                  emptyAsNull: true,
                },
                scale: 'ratio',
                sourceField: '___records___',
              } as CountIndexPatternColumn,
            },
            incompleteColumns: {},
          },
        },
      },
      textBased: {
        layers: {},
      },
      // @ts-expect-error let's challenge the trnasforms with some non-migrated props
      indexpattern: {
        layers: {},
      },
    },
    filters: [],
    internalReferences: [],
    query: {
      language: 'kuery',
      query: 'some_field: *',
    },
    visualization: {
      axisTitlesVisibilitySettings: {
        x: true,
        yLeft: true,
        yRight: true,
      },
      curveType: 'LINEAR',
      fittingFunction: 'Linear',
      gridlinesVisibilitySettings: {
        x: false,
        yLeft: false,
        yRight: true,
      },
      labelsOrientation: {
        x: 0,
        yLeft: 0,
        yRight: -90,
      },
      layers: [
        {
          accessors: ['dc5b22e3-48ef-447d-a0e5-60fdad78cf50'],
          isHistogram: true,
          layerId: '5072f3dd-f0c9-4bfd-a3a4-b9022695c1f4',
          layerType: 'data',
          palette: {
            name: 'default',
            type: 'palette',
          },
          seriesType: 'line',
          simpleView: false,
          xAccessor: '315033e2-8172-4213-87e0-d4e7f09ccca7',
          xScaleType: 'time',
          yConfig: [
            {
              axisMode: 'left',
              forAccessor: 'dc5b22e3-48ef-447d-a0e5-60fdad78cf50',
            },
          ],
        },
      ],
      legend: {
        isVisible: true,
        legendSize: 'auto',
        maxLines: 1,
        position: 'right',
        shouldTruncate: true,
        showSingleSeries: true,
      },
      preferredSeriesType: 'bar_stacked',
      showCurrentTimeMarker: false,
      tickLabelsVisibilitySettings: {
        x: true,
        yLeft: true,
        yRight: true,
      },
      valueLabels: 'hide',
      valuesInLegend: false,
      yLeftExtent: {
        enforce: true,
        mode: 'dataBounds',
      },
      yLeftScale: 'linear',
      yRightScale: 'linear',
      yTitle: 'Count',
    },
  },
  references: [
    {
      id: 'logs-*',
      name: 'indexpattern-datasource-layer-5072f3dd-f0c9-4bfd-a3a4-b9022695c1f4',
      type: 'index-pattern',
    },
  ],
};

export const multipleMetricsXY: LensAttributes = {
  type: 'lens',
  visualizationType: 'lnsXY',
  title: 'Lens Title',
  state: {
    adHocDataViews: {},
    datasourceStates: {
      formBased: {
        layers: {
          '5072f3dd-f0c9-4bfd-a3a4-b9022695c1f4': {
            columnOrder: [
              '315033e2-8172-4213-87e0-d4e7f09ccca7',
              'dc5b22e3-48ef-447d-a0e5-60fdad78cf50',
              'dc5b22e3-48ef-447d-a0e5-60fdad78cf51',
              'dc5b22e3-48ef-447d-a0e5-60fdad78cf52',
            ],
            columns: {
              '315033e2-8172-4213-87e0-d4e7f09ccca7': {
                customLabel: true,
                dataType: 'date',
                isBucketed: true,
                label: '@timestamp',
                operationType: 'date_histogram',
                params: {
                  dropPartials: false,
                  includeEmptyRows: false,
                  interval: 'auto',
                },
                scale: 'interval',
                sourceField: '@timestamp',
              } as DateHistogramIndexPatternColumn,
              'dc5b22e3-48ef-447d-a0e5-60fdad78cf50': {
                customLabel: true,
                dataType: 'number',
                isBucketed: false,
                label: 'Count',
                operationType: 'count',
                params: {
                  emptyAsNull: true,
                },
                scale: 'ratio',
                sourceField: '___records___',
              } as CountIndexPatternColumn,
              'dc5b22e3-48ef-447d-a0e5-60fdad78cf51': {
                customLabel: true,
                dataType: 'number',
                isBucketed: false,
                label: 'Count',
                operationType: 'count',
                params: {
                  emptyAsNull: true,
                },
                scale: 'ratio',
                sourceField: '___records___',
              } as CountIndexPatternColumn,
              'dc5b22e3-48ef-447d-a0e5-60fdad78cf52': {
                customLabel: true,
                dataType: 'number',
                isBucketed: false,
                label: 'Count',
                operationType: 'count',
                params: {
                  emptyAsNull: true,
                },
                scale: 'ratio',
                sourceField: '___records___',
              } as CountIndexPatternColumn,
            },
            incompleteColumns: {},
          },
        },
      },
      textBased: {
        layers: {},
      },
      // @ts-expect-error let's challenge the trnasforms with some non-migrated props
      indexpattern: {
        layers: {},
      },
    },
    filters: [],
    internalReferences: [],
    query: {
      language: 'kuery',
      query: 'some_field: *',
    },
    visualization: {
      axisTitlesVisibilitySettings: {
        x: true,
        yLeft: true,
        yRight: true,
      },
      curveType: 'LINEAR',
      fittingFunction: 'Linear',
      gridlinesVisibilitySettings: {
        x: false,
        yLeft: false,
        yRight: true,
      },
      labelsOrientation: {
        x: 0,
        yLeft: 0,
        yRight: -90,
      },
      layers: [
        {
          accessors: [
            'dc5b22e3-48ef-447d-a0e5-60fdad78cf50',
            'dc5b22e3-48ef-447d-a0e5-60fdad78cf51',
            'dc5b22e3-48ef-447d-a0e5-60fdad78cf52',
          ],
          isHistogram: true,
          layerId: '5072f3dd-f0c9-4bfd-a3a4-b9022695c1f4',
          layerType: 'data',
          palette: {
            name: 'default',
            type: 'palette',
          },
          seriesType: 'line',
          simpleView: false,
          xAccessor: '315033e2-8172-4213-87e0-d4e7f09ccca7',
          xScaleType: 'time',
          yConfig: [
            {
              axisMode: 'left',
              forAccessor: 'dc5b22e3-48ef-447d-a0e5-60fdad78cf50',
            },
            {
              axisMode: 'right',
              forAccessor: 'dc5b22e3-48ef-447d-a0e5-60fdad78cf52',
            },
            // third metric without yConfig
          ],
        },
      ],
      legend: {
        isVisible: true,
        legendSize: 'auto',
        maxLines: 1,
        position: 'right',
        shouldTruncate: true,
        showSingleSeries: true,
      },
      preferredSeriesType: 'bar_stacked',
      showCurrentTimeMarker: false,
      tickLabelsVisibilitySettings: {
        x: true,
        yLeft: true,
        yRight: true,
      },
      valueLabels: 'hide',
      valuesInLegend: false,
      yLeftExtent: {
        enforce: true,
        mode: 'dataBounds',
      },
      yLeftScale: 'linear',
      yRightScale: 'linear',
      yTitle: 'Count',
    },
  },
  references: [
    {
      id: 'logs-*',
      name: 'indexpattern-datasource-layer-5072f3dd-f0c9-4bfd-a3a4-b9022695c1f4',
      type: 'index-pattern',
    },
  ],
};

export const breakdownXY: LensAttributes = {
  visualizationType: 'lnsXY',
  title: 'Lens title',
  state: {
    datasourceStates: {
      formBased: {
        layers: {
          '5072f3dd-f0c9-4bfd-a3a4-b9022695c1f4': {
            columnOrder: [
              '315033e2-8172-4213-87e0-d4e7f09ccca7',
              'dc5b22e3-48ef-447d-a0e5-60fdad78cf50',
              '315033e2-8172-4213-87e0-d4e7f09cccaX',
            ],
            columns: {
              '315033e2-8172-4213-87e0-d4e7f09ccca7': {
                isBucketed: true,
                dataType: 'date',
                label: '@timestamp',
                operationType: 'date_histogram',
                sourceField: '@timestamp',
                params: {
                  interval: 'auto',
                },
              } as DateHistogramIndexPatternColumn,
              'dc5b22e3-48ef-447d-a0e5-60fdad78cf50': {
                isBucketed: false,
                dataType: 'number',
                operationType: 'count',
                sourceField: '___records___',
                label: 'Count of Records',
              },
              '315033e2-8172-4213-87e0-d4e7f09cccaX': {
                isBucketed: true,
                dataType: 'string',
                label: 'host.name',
                operationType: 'terms',
                sourceField: 'host.name',
                params: {
                  orderBy: {
                    columnId: 'dc5b22e3-48ef-447d-a0e5-60fdad78cf50',
                    type: 'column',
                  },
                  orderDirection: 'desc',
                  otherBucket: false,
                  parentFormat: {
                    id: 'terms',
                  },
                  size: 5,
                },
              } as TermsIndexPatternColumn,
            },
          },
        },
      },
    },
    visualization: {
      layers: [
        {
          accessors: ['dc5b22e3-48ef-447d-a0e5-60fdad78cf50'],
          isHistogram: true,
          layerId: '5072f3dd-f0c9-4bfd-a3a4-b9022695c1f4',
          layerType: 'data',
          seriesType: 'line',
          xAccessor: '315033e2-8172-4213-87e0-d4e7f09ccca7',
          splitAccessor: '315033e2-8172-4213-87e0-d4e7f09cccaX',
        },
      ],
      legend: {
        isVisible: true,
        position: 'right',
      },
      preferredSeriesType: 'bar_stacked',
    },
    filters: [],
    query: {
      query: '',
      language: 'kuery',
    },
  },
  references: [
    {
      id: 'logs-*',
      name: 'indexpattern-datasource-layer-5072f3dd-f0c9-4bfd-a3a4-b9022695c1f4',
      type: 'index-pattern',
    },
  ],
};

export const barWithTwoLayersAttributes: LensAttributes = {
  visualizationType: 'lnsXY',
  title: 'Lens title',
  state: {
    datasourceStates: {
      formBased: {
        layers: {
          '5072f3dd-f0c9-4bfd-a3a4-b9022695c1f4': {
            columnOrder: [
              '315033e2-8172-4213-87e0-d4e7f09ccca7',
              'dc5b22e3-48ef-447d-a0e5-60fdad78cf50',
            ],
            columns: {
              '315033e2-8172-4213-87e0-d4e7f09ccca7': {
                isBucketed: true,
                dataType: 'date',
                label: '@timestamp',
                operationType: 'date_histogram',
                sourceField: '@timestamp',
                params: {
                  interval: 'auto',
                },
              } as DateHistogramIndexPatternColumn,
              'dc5b22e3-48ef-447d-a0e5-60fdad78cf50': {
                isBucketed: false,
                dataType: 'number',
                operationType: 'count',
                sourceField: '___records___',
                label: 'Count of Records',
              },
              '315033e2-8172-4213-87e0-d4e7f09cccaX': {
                isBucketed: true,
                dataType: 'string',
                label: 'host.name',
                operationType: 'terms',
                sourceField: 'host.name',
                params: {
                  orderBy: {
                    columnId: 'dc5b22e3-48ef-447d-a0e5-60fdad78cf50',
                    type: 'column',
                  },
                  orderDirection: 'desc',
                  otherBucket: false,
                  parentFormat: {
                    id: 'terms',
                  },
                  size: 5,
                },
              } as TermsIndexPatternColumn,
            },
          },
          layer2: {
            columnOrder: ['layer2_date_histogram', 'layer2_metric1'],
            columns: {
              layer2_date_histogram: {
                isBucketed: true,
                dataType: 'date',
                label: '@timestamp',
                operationType: 'date_histogram',
                sourceField: '@timestamp',
                params: {
                  interval: 'auto',
                },
              } as DateHistogramIndexPatternColumn,
              layer2_metric1: {
                isBucketed: false,
                dataType: 'number',
                operationType: 'count',
                sourceField: '___records___',
                label: 'Count of Records',
              },
              layer2_terms: {
                isBucketed: true,
                dataType: 'string',
                label: 'host.name',
                operationType: 'terms',
                sourceField: 'host.name',

                params: {
                  orderBy: {
                    columnId: 'layer2_metric1',
                    type: 'column',
                  },
                  orderDirection: 'desc',
                  otherBucket: false,
                  parentFormat: {
                    id: 'terms',
                  },
                  size: 5,
                },
              } as TermsIndexPatternColumn,
            },
          },
        },
      },
    },
    visualization: {
      layers: [
        {
          accessors: ['dc5b22e3-48ef-447d-a0e5-60fdad78cf50'],
          isHistogram: true,
          layerId: '5072f3dd-f0c9-4bfd-a3a4-b9022695c1f4',
          layerType: 'data',
          seriesType: 'line',
          xAccessor: '315033e2-8172-4213-87e0-d4e7f09ccca7',
          splitAccessor: '315033e2-8172-4213-87e0-d4e7f09cccaX',
        },
        {
          accessors: ['layer2_metric1'],
          isHistogram: true,
          layerId: 'layer2',
          layerType: 'data',
          seriesType: 'line',
          xAccessor: 'layer2_date_histogram',
          splitAccessor: 'layer2_terms',
        },
      ],
      legend: {
        isVisible: true,
        position: 'right',
      },
      preferredSeriesType: 'bar_stacked',
    },
    filters: [],
    query: {
      query: '',
      language: 'kuery',
    },
  },
  references: [
    {
      id: 'logs-*',
      name: 'indexpattern-datasource-layer-5072f3dd-f0c9-4bfd-a3a4-b9022695c1f4',
      type: 'index-pattern',
    },
    {
      id: 'logs-*',
      name: 'indexpattern-datasource-layer-layer2',
      type: 'index-pattern',
    },
  ],
};

export const mixedChartAttributes: LensAttributes = {
  visualizationType: 'lnsXY',
  title: 'Lens title',
  state: {
    datasourceStates: {
      formBased: {
        layers: {
          '5072f3dd-f0c9-4bfd-a3a4-b9022695c1f4': {
            columnOrder: [
              '315033e2-8172-4213-87e0-d4e7f09ccca7',
              'dc5b22e3-48ef-447d-a0e5-60fdad78cf50',
            ],
            columns: {
              '315033e2-8172-4213-87e0-d4e7f09ccca7': {
                isBucketed: true,
                dataType: 'date',
                label: '@timestamp',
                operationType: 'date_histogram',
                sourceField: '@timestamp',
                params: {
                  interval: 'auto',
                },
              } as DateHistogramIndexPatternColumn,
              'dc5b22e3-48ef-447d-a0e5-60fdad78cf50': {
                isBucketed: false,
                dataType: 'number',
                operationType: 'count',
                sourceField: '___records___',
                label: 'Count of Records',
              },
              '315033e2-8172-4213-87e0-d4e7f09cccaX': {
                isBucketed: true,
                dataType: 'string',
                label: 'host.name',
                operationType: 'terms',
                sourceField: 'host.name',

                params: {
                  orderBy: {
                    columnId: 'dc5b22e3-48ef-447d-a0e5-60fdad78cf50',
                    type: 'column',
                  },
                  orderDirection: 'desc',
                  otherBucket: false,
                  parentFormat: {
                    id: 'terms',
                  },
                  size: 5,
                },
              } as TermsIndexPatternColumn,
            },
          },
          layer2: {
            columnOrder: ['layer2_date_histogram', 'layer2_metric1'],
            columns: {
              layer2_date_histogram: {
                isBucketed: true,
                dataType: 'date',
                label: '@timestamp',
                operationType: 'date_histogram',
                sourceField: '@timestamp',
                params: {
                  interval: 'auto',
                },
              } as DateHistogramIndexPatternColumn,
              layer2_metric1: {
                isBucketed: false,
                dataType: 'number',
                operationType: 'count',
                sourceField: '___records___',
                label: 'Count of Records',
              },
              layer2_terms: {
                isBucketed: true,
                dataType: 'string',
                label: 'host.name',
                operationType: 'terms',
                sourceField: 'host.name',

                params: {
                  orderBy: {
                    columnId: 'layer2_metric1',
                    type: 'column',
                  },
                  orderDirection: 'desc',
                  otherBucket: false,
                  parentFormat: {
                    id: 'terms',
                  },
                  size: 5,
                },
              } as TermsIndexPatternColumn,
            },
          },
          layer3: {
            columnOrder: ['layer3_date_histogram', 'layer3_metric1'],
            columns: {
              layer3_date_histogram: {
                isBucketed: true,
                dataType: 'date',
                label: '@timestamp',
                operationType: 'date_histogram',
                sourceField: '@timestamp',
                params: {
                  interval: 'auto',
                },
              } as DateHistogramIndexPatternColumn,
              layer3_metric1: {
                isBucketed: false,
                dataType: 'number',
                operationType: 'count',
                sourceField: '___records___',
                label: 'Count of Records',
              },
              layer3_terms: {
                isBucketed: true,
                dataType: 'string',
                label: 'host.name',
                operationType: 'terms',
                sourceField: 'host.name',
                params: {
                  orderBy: {
                    columnId: 'layer3_metric1',
                    type: 'column',
                  },
                  orderDirection: 'desc',
                  otherBucket: false,
                  parentFormat: {
                    id: 'terms',
                  },
                  size: 5,
                },
              } as TermsIndexPatternColumn,
            },
          },
        },
      },
    },
    visualization: {
      layers: [
        {
          accessors: ['dc5b22e3-48ef-447d-a0e5-60fdad78cf50'],
          isHistogram: true,
          layerId: '5072f3dd-f0c9-4bfd-a3a4-b9022695c1f4',
          layerType: 'data',
          seriesType: 'line',
          xAccessor: '315033e2-8172-4213-87e0-d4e7f09ccca7',
          splitAccessor: '315033e2-8172-4213-87e0-d4e7f09cccaX',
        },
        {
          accessors: ['layer2_metric1'],
          isHistogram: true,
          layerId: 'layer2',
          layerType: 'data',
          seriesType: 'bar',
          xAccessor: 'layer2_date_histogram',
          splitAccessor: 'layer2_terms',
        },
        {
          accessors: ['layer3_metric1'],
          isHistogram: true,
          layerId: 'layer3',
          layerType: 'data',
          seriesType: 'area',
          xAccessor: 'layer3_date_histogram',
          splitAccessor: 'layer3_terms',
        },
      ],
      legend: {
        isVisible: true,
        position: 'right',
      },
      preferredSeriesType: 'bar_stacked',
    },
    filters: [],
    query: {
      query: '',
      language: 'kuery',
    },
  },
  references: [
    {
      id: 'logs-*',
      name: 'indexpattern-datasource-layer-5072f3dd-f0c9-4bfd-a3a4-b9022695c1f4',
      type: 'index-pattern',
    },
    {
      id: 'logs-*',
      name: 'indexpattern-datasource-layer-layer2',
      type: 'index-pattern',
    },
    {
      id: 'logs-*',
      name: 'indexpattern-datasource-layer-layer3',
      type: 'index-pattern',
    },
  ],
};

export const xyWithFormulaRefColumnsAndRankByTermsBucketOperationAttributes: LensAttributes = {
  title: 'Formula reference columns and rank_by in the terms bucket operation',
  visualizationType: 'lnsXY',
  type: 'lens',
  references: [
    {
      type: 'index-pattern',
      id: '90943e30-9a47-11e8-b64d-95841ca0b247',
      name: 'indexpattern-datasource-layer-1a4354e7-8b60-4b43-b594-dca7f1946996',
    },
  ],
  state: {
    visualization: {
      title: 'Empty XY chart',
      legend: {
        isVisible: true,
        position: 'right',
      },
      valueLabels: 'hide',
      preferredSeriesType: 'bar_stacked',
      layers: [
        {
          layerId: '1a4354e7-8b60-4b43-b594-dca7f1946996',
          accessors: [
            '8bb98494-44f3-4961-a950-e3ab2ff41caa',
            '0f26965d-24ea-431b-9bba-7fe581ad52f5',
            '7bfd43ca-505f-4456-aa68-edf578527112',
          ],
          position: 'top',
          seriesType: 'bar_stacked',
          showGridlines: false,
          layerType: 'data',
          colorMapping: {
            assignments: [],
            specialAssignments: [
              {
                rules: [
                  {
                    type: 'other',
                  },
                ],
                color: {
                  type: 'loop',
                },
                touched: false,
              },
            ],
            paletteId: 'default',
            colorMode: {
              type: 'categorical',
            },
          },
          xAccessor: 'a035289e-8808-47f3-9bba-b1c5872cdff1',
        },
      ],
    },
    query: {
      query: '',
      language: 'kuery',
    },
    filters: [],
    datasourceStates: {
      formBased: {
        layers: {
          '1a4354e7-8b60-4b43-b594-dca7f1946996': {
            columns: {
              'a035289e-8808-47f3-9bba-b1c5872cdff1': {
                label: 'Top 5 values of geo.dest',
                dataType: 'string',
                operationType: 'terms',
                sourceField: 'geo.dest',
                isBucketed: true,
                params: {
                  size: 5,
                  orderBy: {
                    type: 'column',
                    columnId: '0f26965d-24ea-431b-9bba-7fe581ad52f5',
                  },
                  orderDirection: 'desc',
                  otherBucket: true,
                  missingBucket: false,
                  parentFormat: {
                    id: 'terms',
                  },
                  include: [],
                  exclude: [],
                  includeIsRegex: false,
                  excludeIsRegex: false,
                },
              } as TermsIndexPatternColumn,
              '8bb98494-44f3-4961-a950-e3ab2ff41caaX0': {
                label: 'Part of last_value(bytes)/last_value(bytes_counter)',
                dataType: 'number',
                operationType: 'last_value',
                isBucketed: false,
                sourceField: 'bytes',
                filter: {
                  query: '"bytes": *',
                  language: 'kuery',
                },
                params: {
                  sortField: 'timestamp',
                },
                customLabel: true,
              } as LastValueIndexPatternColumn,
              '8bb98494-44f3-4961-a950-e3ab2ff41caaX1': {
                label: 'Part of last_value(bytes)/last_value(bytes_counter)',
                dataType: 'number',
                operationType: 'last_value',
                isBucketed: false,
                sourceField: 'bytes_counter',
                filter: {
                  query: '"bytes_counter": *',
                  language: 'kuery',
                },
                params: {
                  sortField: 'timestamp',
                },
                customLabel: true,
              } as LastValueIndexPatternColumn,
              // @ts-expect-error - because the args is an array of strings
              '8bb98494-44f3-4961-a950-e3ab2ff41caaX2': {
                label: 'Part of last_value(bytes)/last_value(bytes_counter)',
                dataType: 'number',
                operationType: 'math',
                isBucketed: false,
                params: {
                  tinymathAst: {
                    type: 'function',
                    name: 'divide',
                    args: [
                      '8bb98494-44f3-4961-a950-e3ab2ff41caaX0',
                      '8bb98494-44f3-4961-a950-e3ab2ff41caaX1',
                    ],
                    location: {
                      min: 0,
                      max: 43,
                    },
                    text: 'last_value(bytes)/last_value(bytes_counter)',
                  },
                },
                references: [
                  '8bb98494-44f3-4961-a950-e3ab2ff41caaX0',
                  '8bb98494-44f3-4961-a950-e3ab2ff41caaX1',
                ],
                customLabel: true,
              } as MathIndexPatternColumn,
              '8bb98494-44f3-4961-a950-e3ab2ff41caa': {
                label: 'last_value(bytes)/last_value(bytes_counter)',
                dataType: 'number',
                operationType: 'formula',
                isBucketed: false,
                params: {
                  formula: 'last_value(bytes)/last_value(bytes_counter)',
                  isFormulaBroken: false,
                },
                references: ['8bb98494-44f3-4961-a950-e3ab2ff41caaX2'],
              } as FormulaIndexPatternColumn,
              '0f26965d-24ea-431b-9bba-7fe581ad52f5': {
                label: 'Average of bytes',
                dataType: 'number',
                operationType: 'average',
                sourceField: 'bytes',
                isBucketed: false,
                params: {
                  emptyAsNull: true,
                },
              } as AvgIndexPatternColumn,
              '7bfd43ca-505f-4456-aa68-edf578527112X0': {
                label: 'Part of average(bytes) * 100',
                dataType: 'number',
                operationType: 'average',
                sourceField: 'bytes',
                isBucketed: false,
                params: {
                  emptyAsNull: false,
                },
                customLabel: true,
              } as AvgIndexPatternColumn,
              '7bfd43ca-505f-4456-aa68-edf578527112X1': {
                label: 'Part of average(bytes) * 100',
                dataType: 'number',
                operationType: 'math',
                isBucketed: false,
                params: {
                  tinymathAst: {
                    type: 'function',
                    name: 'multiply',
                    args: ['7bfd43ca-505f-4456-aa68-edf578527112X0', 100],
                    location: {
                      min: 0,
                      max: 20,
                    },
                    text: 'average(bytes) * 100',
                  },
                },
                references: ['7bfd43ca-505f-4456-aa68-edf578527112X0'],
                customLabel: true,
              } as MathIndexPatternColumn,
              '7bfd43ca-505f-4456-aa68-edf578527112': {
                label: 'average(bytes) * 100',
                dataType: 'number',
                operationType: 'formula',
                isBucketed: false,
                params: {
                  formula: 'average(bytes) * 100',
                  isFormulaBroken: false,
                },
                references: ['7bfd43ca-505f-4456-aa68-edf578527112X1'],
              } as FormulaIndexPatternColumn,
            },
            columnOrder: [
              'a035289e-8808-47f3-9bba-b1c5872cdff1',
              '8bb98494-44f3-4961-a950-e3ab2ff41caa',
              '8bb98494-44f3-4961-a950-e3ab2ff41caaX0',
              '8bb98494-44f3-4961-a950-e3ab2ff41caaX1',
              '8bb98494-44f3-4961-a950-e3ab2ff41caaX2',
              '0f26965d-24ea-431b-9bba-7fe581ad52f5',
              '7bfd43ca-505f-4456-aa68-edf578527112',
              '7bfd43ca-505f-4456-aa68-edf578527112X0',
              '7bfd43ca-505f-4456-aa68-edf578527112X1',
            ],
            sampling: 1,
            ignoreGlobalFilters: false,
            incompleteColumns: {},
            // @ts-expect-error
            indexPatternId: '90943e30-9a47-11e8-b64d-95841ca0b247',
          },
        },
        currentIndexPatternId: '90943e30-9a47-11e8-b64d-95841ca0b247',
      },
      indexpattern: {
        layers: {},
        currentIndexPatternId: '90943e30-9a47-11e8-b64d-95841ca0b247',
      },
      textBased: {
        layers: {},
      },
    },
    internalReferences: [],
    adHocDataViews: {},
  },
  version: 1,
};
