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
  TermsIndexPatternColumn,
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
