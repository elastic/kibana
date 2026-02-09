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
  MedianIndexPatternColumn,
  TermsIndexPatternColumn,
  AvgIndexPatternColumn,
} from '@kbn/lens-common';
import type { LensAttributes } from '../../types';

export const singleMetricDatatableAttributes: LensAttributes = {
  visualizationType: 'lnsDatatable',
  title: 'Single metric',
  state: {
    visualization: {
      columns: [
        {
          columnId: '19fea364-b9b6-44d2-910a-c4a9d4d9aaef',
          isTransposed: false,
          isMetric: true,
        },
      ],
      layerId: 'b0790ddc-c399-4479-a9b8-515a3e8b7591',
      layerType: 'data',
    },
    query: {
      query: '',
      language: 'kuery',
    },
    filters: [],
    datasourceStates: {
      formBased: {
        layers: {
          'b0790ddc-c399-4479-a9b8-515a3e8b7591': {
            columns: {
              '19fea364-b9b6-44d2-910a-c4a9d4d9aaef': {
                label: 'Count of records',
                dataType: 'number',
                operationType: 'count',
                isBucketed: false,
                sourceField: '___records___',
                params: {
                  emptyAsNull: true,
                },
              } as CountIndexPatternColumn,
            },
            columnOrder: ['19fea364-b9b6-44d2-910a-c4a9d4d9aaef'],
            sampling: 1,
            ignoreGlobalFilters: false,
            incompleteColumns: {},
          },
        },
      },
      // @ts-expect-error
      indexpattern: {
        layers: {},
      },
      textBased: {
        layers: {},
      },
    },
    internalReferences: [],
    adHocDataViews: {},
  },
  version: 2,
  references: [
    {
      type: 'index-pattern',
      id: '90943e30-9a47-11e8-b64d-95841ca0b247',
      name: 'indexpattern-datasource-layer-b0790ddc-c399-4479-a9b8-515a3e8b7591',
    },
  ],
};

export const singleMetricRowSplitDatatableAttributes: LensAttributes = {
  visualizationType: 'lnsDatatable',
  title: 'Single metric row split',
  state: {
    visualization: {
      columns: [
        {
          columnId: 'fafe36ad-dc89-4d89-b93d-d746cdec1c8b',
          isTransposed: false,
          isMetric: false,
        },
        {
          columnId: '1908848c-2738-4cfa-8d91-2be7749071ab',
          isTransposed: false,
          isMetric: true,
        },
        {
          columnId: 'e4ca25b3-187d-4795-9b0b-8d665f91920d',
          isTransposed: true,
          isMetric: false,
        },
      ],
      layerId: '562ae4ff-c81a-4cd9-8206-87b13e94def0',
      layerType: 'data',
    },
    query: {
      query: '',
      language: 'kuery',
    },
    filters: [],
    datasourceStates: {
      formBased: {
        layers: {
          '562ae4ff-c81a-4cd9-8206-87b13e94def0': {
            columns: {
              'fafe36ad-dc89-4d89-b93d-d746cdec1c8b': {
                label: 'Top 5 values of geo.dest',
                dataType: 'string',
                operationType: 'terms',
                sourceField: 'geo.dest',
                isBucketed: true,
                params: {
                  size: 5,
                  orderBy: {
                    type: 'column',
                    columnId: '1908848c-2738-4cfa-8d91-2be7749071ab',
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
              '1908848c-2738-4cfa-8d91-2be7749071ab': {
                label: 'Median of bytes',
                dataType: 'number',
                operationType: 'median',
                sourceField: 'bytes',
                isBucketed: false,
                params: {
                  emptyAsNull: true,
                },
              } as MedianIndexPatternColumn,
              'e4ca25b3-187d-4795-9b0b-8d665f91920d': {
                label: 'Top 3 values of agent.keyword',
                dataType: 'string',
                operationType: 'terms',
                sourceField: 'agent.keyword',
                isBucketed: true,
                params: {
                  size: 3,
                  orderBy: {
                    type: 'column',
                    columnId: '1908848c-2738-4cfa-8d91-2be7749071ab',
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
            },
            columnOrder: [
              'e4ca25b3-187d-4795-9b0b-8d665f91920d',
              'fafe36ad-dc89-4d89-b93d-d746cdec1c8b',
              '1908848c-2738-4cfa-8d91-2be7749071ab',
            ],
            sampling: 1,
            ignoreGlobalFilters: false,
            incompleteColumns: {},
          },
        },
      },
      // @ts-expect-error
      indexpattern: {
        layers: {},
      },
      textBased: {
        layers: {},
      },
    },
    internalReferences: [],
    adHocDataViews: {},
  },
  version: 2,
  references: [
    {
      type: 'index-pattern',
      id: '90943e30-9a47-11e8-b64d-95841ca0b247',
      name: 'indexpattern-datasource-layer-562ae4ff-c81a-4cd9-8206-87b13e94def0',
    },
  ],
};

export const multiMetricRowSplitDatatableAttributes: LensAttributes = {
  visualizationType: 'lnsDatatable',
  title: 'Multiple metrics, rows, split by',
  state: {
    visualization: {
      columns: [
        {
          columnId: '1908848c-2738-4cfa-8d91-2be7749071ab',
          isTransposed: false,
          isMetric: true,
        },
        {
          columnId: '3b02633f-216a-4d1b-be8d-e3152e407328',
          isTransposed: false,
          isMetric: false,
        },
        {
          columnId: 'a63de8c6-64b4-4714-9461-a57de3728dc8',
          isTransposed: true,
          isMetric: false,
        },
        {
          columnId: 'a6f301c1-4550-4ef9-9356-8de273dbaecd',
          isTransposed: true,
          isMetric: false,
        },
        {
          columnId: '0fd5756f-9def-4c27-ac24-8ceab16272a9',
          isTransposed: false,
          isMetric: false,
        },
        {
          columnId: '62d13d71-0891-49aa-88da-4ba5228e4891',
          isTransposed: false,
          isMetric: true,
        },
      ],
      layerId: '562ae4ff-c81a-4cd9-8206-87b13e94def0',
      layerType: 'data',
    },
    query: {
      query: '',
      language: 'kuery',
    },
    filters: [],
    datasourceStates: {
      formBased: {
        layers: {
          '562ae4ff-c81a-4cd9-8206-87b13e94def0': {
            columns: {
              '1908848c-2738-4cfa-8d91-2be7749071ab': {
                label: 'Median of bytes',
                dataType: 'number',
                operationType: 'median',
                sourceField: 'bytes',
                isBucketed: false,
                params: {
                  emptyAsNull: true,
                },
              } as MedianIndexPatternColumn,
              '3b02633f-216a-4d1b-be8d-e3152e407328': {
                label: 'Top 3 values of agent.keyword',
                dataType: 'string',
                operationType: 'terms',
                sourceField: 'agent.keyword',
                isBucketed: true,
                params: {
                  size: 3,
                  orderBy: {
                    type: 'column',
                    columnId: '1908848c-2738-4cfa-8d91-2be7749071ab',
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
              'a63de8c6-64b4-4714-9461-a57de3728dc8': {
                label: 'Top 3 values of geo.src',
                dataType: 'string',
                operationType: 'terms',
                sourceField: 'geo.src',
                isBucketed: true,
                params: {
                  size: 3,
                  orderBy: {
                    type: 'column',
                    columnId: '1908848c-2738-4cfa-8d91-2be7749071ab',
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
              'a6f301c1-4550-4ef9-9356-8de273dbaecd': {
                label: 'Top 5 values of geo.dest',
                dataType: 'string',
                operationType: 'terms',
                sourceField: 'geo.dest',
                isBucketed: true,
                params: {
                  size: 5,
                  orderBy: {
                    type: 'column',
                    columnId: '1908848c-2738-4cfa-8d91-2be7749071ab',
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
              '0fd5756f-9def-4c27-ac24-8ceab16272a9': {
                label: '@timestamp',
                dataType: 'date',
                operationType: 'date_histogram',
                sourceField: '@timestamp',
                isBucketed: true,
                params: {
                  interval: 'h',
                  includeEmptyRows: true,
                  dropPartials: false,
                },
              } as DateHistogramIndexPatternColumn,
              '62d13d71-0891-49aa-88da-4ba5228e4891': {
                label: 'Average of bytes',
                dataType: 'number',
                operationType: 'average',
                sourceField: 'bytes',
                isBucketed: false,
                params: {
                  emptyAsNull: true,
                },
              } as AvgIndexPatternColumn,
            },
            columnOrder: [
              'a63de8c6-64b4-4714-9461-a57de3728dc8',
              'a6f301c1-4550-4ef9-9356-8de273dbaecd',
              '3b02633f-216a-4d1b-be8d-e3152e407328',
              '0fd5756f-9def-4c27-ac24-8ceab16272a9',
              '1908848c-2738-4cfa-8d91-2be7749071ab',
              '62d13d71-0891-49aa-88da-4ba5228e4891',
            ],
            sampling: 1,
            ignoreGlobalFilters: false,
            incompleteColumns: {},
          },
        },
      },
      // @ts-expect-error
      indexpattern: {
        layers: {},
      },
      textBased: {
        layers: {},
      },
    },
    internalReferences: [],
    adHocDataViews: {},
  },
  version: 2,
  references: [
    {
      type: 'index-pattern',
      id: '90943e30-9a47-11e8-b64d-95841ca0b247',
      name: 'indexpattern-datasource-layer-562ae4ff-c81a-4cd9-8206-87b13e94def0',
    },
  ],
};

export const fullConfigDatatableAttributes: LensAttributes = {
  visualizationType: 'lnsDatatable',
  title: 'Multiple metrics, rows, split by with full config',
  state: {
    visualization: {
      columns: [
        {
          columnId: '1908848c-2738-4cfa-8d91-2be7749071ab',
          isTransposed: false,
          isMetric: true,
          alignment: 'center',
          colorMode: 'cell',
          palette: {
            type: 'palette',
            name: 'positive',
            params: {
              stops: [
                {
                  color: '#d4efe6',
                  stop: 20,
                },
                {
                  color: '#b1e4d1',
                  stop: 40,
                },
                {
                  color: '#8cd9bb',
                  stop: 60,
                },
                {
                  color: '#62cea6',
                  stop: 80,
                },
                {
                  color: '#24c292',
                  stop: 100,
                },
              ],
            },
          },
          summaryRow: 'none',
        },
        {
          columnId: '3b02633f-216a-4d1b-be8d-e3152e407328',
          isTransposed: false,
          isMetric: false,
          alignment: 'right',
          colorMode: 'cell',
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
          palette: {
            type: 'palette',
            name: 'default',
            params: {
              stops: [
                {
                  color: '#16c5c0',
                  stop: 20,
                },
                {
                  color: '#a6edea',
                  stop: 40,
                },
                {
                  color: '#61a2ff',
                  stop: 60,
                },
                {
                  color: '#bfdbff',
                  stop: 80,
                },
                {
                  color: '#ee72a6',
                  stop: 100,
                },
              ],
            },
          },
        },
        {
          columnId: 'a63de8c6-64b4-4714-9461-a57de3728dc8',
          isTransposed: true,
          isMetric: false,
        },
        {
          columnId: 'a6f301c1-4550-4ef9-9356-8de273dbaecd',
          isTransposed: true,
          isMetric: false,
        },
        {
          columnId: '0fd5756f-9def-4c27-ac24-8ceab16272a9',
          isTransposed: false,
          isMetric: false,
          hidden: true,
        },
        {
          columnId: '62d13d71-0891-49aa-88da-4ba5228e4891',
          isTransposed: false,
          isMetric: true,
          colorMode: 'text',
          palette: {
            type: 'palette',
            name: 'positive',
            params: {
              stops: [
                {
                  color: '#d4efe6',
                  stop: 20,
                },
                {
                  color: '#b1e4d1',
                  stop: 40,
                },
                {
                  color: '#8cd9bb',
                  stop: 60,
                },
                {
                  color: '#62cea6',
                  stop: 80,
                },
                {
                  color: '#24c292',
                  stop: 100,
                },
              ],
            },
          },
          hidden: false,
          summaryRow: 'avg',
        },
      ],
      layerId: '562ae4ff-c81a-4cd9-8206-87b13e94def0',
      layerType: 'data',
      density: 'compact',
      headerRowHeight: 'auto',
      headerRowHeightLines: 'auto',
      rowHeightLines: 3,
      paging: {
        size: 10,
        enabled: true,
      },
    },
    query: {
      query: '',
      language: 'kuery',
    },
    filters: [],
    datasourceStates: {
      formBased: {
        layers: {
          '562ae4ff-c81a-4cd9-8206-87b13e94def0': {
            columns: {
              '1908848c-2738-4cfa-8d91-2be7749071ab': {
                label: 'Median of bytes',
                dataType: 'number',
                operationType: 'median',
                sourceField: 'bytes',
                isBucketed: false,
                params: {
                  emptyAsNull: true,
                },
              } as MedianIndexPatternColumn,
              '3b02633f-216a-4d1b-be8d-e3152e407328': {
                label: 'Top 3 values of agent.keyword',
                dataType: 'string',
                operationType: 'terms',
                sourceField: 'agent.keyword',
                isBucketed: true,
                params: {
                  size: 3,
                  orderBy: {
                    type: 'column',
                    columnId: '1908848c-2738-4cfa-8d91-2be7749071ab',
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
              'a63de8c6-64b4-4714-9461-a57de3728dc8': {
                label: 'Top 3 values of geo.src',
                dataType: 'string',
                operationType: 'terms',
                sourceField: 'geo.src',
                isBucketed: true,
                params: {
                  size: 3,
                  orderBy: {
                    type: 'column',
                    columnId: '1908848c-2738-4cfa-8d91-2be7749071ab',
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
              'a6f301c1-4550-4ef9-9356-8de273dbaecd': {
                label: 'Top 5 values of geo.dest',
                dataType: 'string',
                operationType: 'terms',
                sourceField: 'geo.dest',
                isBucketed: true,
                params: {
                  size: 5,
                  orderBy: {
                    type: 'column',
                    columnId: '1908848c-2738-4cfa-8d91-2be7749071ab',
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
              '0fd5756f-9def-4c27-ac24-8ceab16272a9': {
                label: '@timestamp',
                dataType: 'date',
                operationType: 'date_histogram',
                sourceField: '@timestamp',
                isBucketed: true,
                params: {
                  interval: 'h',
                  includeEmptyRows: true,
                  dropPartials: false,
                },
              } as DateHistogramIndexPatternColumn,
              '62d13d71-0891-49aa-88da-4ba5228e4891': {
                label: 'Average of bytes',
                dataType: 'number',
                operationType: 'average',
                sourceField: 'bytes',
                isBucketed: false,
                params: {
                  emptyAsNull: true,
                },
              } as AvgIndexPatternColumn,
            },
            columnOrder: [
              'a63de8c6-64b4-4714-9461-a57de3728dc8',
              'a6f301c1-4550-4ef9-9356-8de273dbaecd',
              '3b02633f-216a-4d1b-be8d-e3152e407328',
              '0fd5756f-9def-4c27-ac24-8ceab16272a9',
              '1908848c-2738-4cfa-8d91-2be7749071ab',
              '62d13d71-0891-49aa-88da-4ba5228e4891',
            ],
            sampling: 1,
            ignoreGlobalFilters: false,
            incompleteColumns: {},
          },
        },
      },
      // @ts-expect-error
      indexpattern: {
        layers: {},
      },
      textBased: {
        layers: {},
      },
    },
    internalReferences: [],
    adHocDataViews: {},
  },
  version: 2,
  references: [
    {
      type: 'index-pattern',
      id: '90943e30-9a47-11e8-b64d-95841ca0b247',
      name: 'indexpattern-datasource-layer-562ae4ff-c81a-4cd9-8206-87b13e94def0',
    },
  ],
};

export const sortedByTransposedMetricColumnDatatableAttributes: LensAttributes = {
  visualizationType: 'lnsDatatable',
  title: 'Sorted datatable by transposed metric column',
  state: {
    visualization: {
      layerId: 'a08718f8-c67e-42d1-bbe3-ee1e6a457983',
      layerType: 'data',
      columns: [
        {
          columnId: 'c3db85ad-ecfd-4b4d-b5bb-3b67684dbb35',
        },
        {
          columnId: '2a498d57-f600-4720-9fad-9fb9ec7fd72b',
          isTransposed: false,
          isMetric: false,
        },
        {
          columnId: 'db2eaa28-845f-4678-ae34-87de5fc99208',
          isTransposed: true,
          isMetric: false,
        },
        {
          columnId: 'fe6434d9-db87-4e46-beb9-17413a21beb9',
          isTransposed: true,
          isMetric: false,
        },
      ],
      sorting: {
        columnId: 'US---ZM---c3db85ad-ecfd-4b4d-b5bb-3b67684dbb35',
        direction: 'desc',
      },
    },
    query: {
      query: '',
      language: 'kuery',
    },
    filters: [],
    datasourceStates: {
      formBased: {
        layers: {
          'a08718f8-c67e-42d1-bbe3-ee1e6a457983': {
            columns: {
              'c3db85ad-ecfd-4b4d-b5bb-3b67684dbb35': {
                label: 'Median of bytes',
                dataType: 'number',
                operationType: 'median',
                sourceField: 'bytes',
                isBucketed: false,
                params: {
                  emptyAsNull: true,
                },
              } as MedianIndexPatternColumn,
              '2a498d57-f600-4720-9fad-9fb9ec7fd72b': {
                label: 'Top 5 values of agent.keyword',
                dataType: 'string',
                operationType: 'terms',
                sourceField: 'agent.keyword',
                isBucketed: true,
                params: {
                  size: 5,
                  orderBy: {
                    type: 'column',
                    columnId: 'c3db85ad-ecfd-4b4d-b5bb-3b67684dbb35',
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
              'db2eaa28-845f-4678-ae34-87de5fc99208': {
                label: 'Top 3 values of geo.dest',
                dataType: 'string',
                operationType: 'terms',
                sourceField: 'geo.dest',
                isBucketed: true,
                params: {
                  size: 3,
                  orderBy: {
                    type: 'column',
                    columnId: 'c3db85ad-ecfd-4b4d-b5bb-3b67684dbb35',
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
              'fe6434d9-db87-4e46-beb9-17413a21beb9': {
                label: 'Top 3 values of geo.src',
                dataType: 'string',
                operationType: 'terms',
                sourceField: 'geo.src',
                isBucketed: true,
                params: {
                  size: 3,
                  orderBy: {
                    type: 'column',
                    columnId: 'c3db85ad-ecfd-4b4d-b5bb-3b67684dbb35',
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
            },
            columnOrder: [
              'fe6434d9-db87-4e46-beb9-17413a21beb9',
              'db2eaa28-845f-4678-ae34-87de5fc99208',
              '2a498d57-f600-4720-9fad-9fb9ec7fd72b',
              'c3db85ad-ecfd-4b4d-b5bb-3b67684dbb35',
            ],
            incompleteColumns: {},
            sampling: 1,
          },
        },
      },
      // @ts-expect-error
      indexpattern: {
        layers: {},
      },
      textBased: {
        layers: {},
      },
    },
    internalReferences: [],
    adHocDataViews: {},
  },
  version: 2,
  references: [
    {
      type: 'index-pattern',
      id: '90943e30-9a47-11e8-b64d-95841ca0b247',
      name: 'indexpattern-datasource-layer-a08718f8-c67e-42d1-bbe3-ee1e6a457983',
    },
  ],
};

export const sortedByRowDatatableAttributes: LensAttributes = {
  visualizationType: 'lnsDatatable',
  title: 'Sorted datatable by transposed metric column',
  state: {
    visualization: {
      layerId: 'a08718f8-c67e-42d1-bbe3-ee1e6a457983',
      layerType: 'data',
      columns: [
        {
          columnId: 'c3db85ad-ecfd-4b4d-b5bb-3b67684dbb35',
        },
        {
          columnId: '2a498d57-f600-4720-9fad-9fb9ec7fd72b',
          isTransposed: false,
          isMetric: false,
        },
        {
          columnId: 'db2eaa28-845f-4678-ae34-87de5fc99208',
          isTransposed: true,
          isMetric: false,
        },
        {
          columnId: 'fe6434d9-db87-4e46-beb9-17413a21beb9',
          isTransposed: true,
          isMetric: false,
        },
      ],
      sorting: {
        columnId: '2a498d57-f600-4720-9fad-9fb9ec7fd72b',
        direction: 'asc',
      },
    },
    query: {
      query: '',
      language: 'kuery',
    },
    filters: [],
    datasourceStates: {
      formBased: {
        layers: {
          'a08718f8-c67e-42d1-bbe3-ee1e6a457983': {
            columns: {
              'c3db85ad-ecfd-4b4d-b5bb-3b67684dbb35': {
                label: 'Median of bytes',
                dataType: 'number',
                operationType: 'median',
                sourceField: 'bytes',
                isBucketed: false,
                params: {
                  emptyAsNull: true,
                },
              } as MedianIndexPatternColumn,
              '2a498d57-f600-4720-9fad-9fb9ec7fd72b': {
                label: 'Top 5 values of agent.keyword',
                dataType: 'string',
                operationType: 'terms',
                sourceField: 'agent.keyword',
                isBucketed: true,
                params: {
                  size: 5,
                  orderBy: {
                    type: 'column',
                    columnId: 'c3db85ad-ecfd-4b4d-b5bb-3b67684dbb35',
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
              'db2eaa28-845f-4678-ae34-87de5fc99208': {
                label: 'Top 3 values of geo.dest',
                dataType: 'string',
                operationType: 'terms',
                sourceField: 'geo.dest',
                isBucketed: true,
                params: {
                  size: 3,
                  orderBy: {
                    type: 'column',
                    columnId: 'c3db85ad-ecfd-4b4d-b5bb-3b67684dbb35',
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
              'fe6434d9-db87-4e46-beb9-17413a21beb9': {
                label: 'Top 3 values of geo.src',
                dataType: 'string',
                operationType: 'terms',
                sourceField: 'geo.src',
                isBucketed: true,
                params: {
                  size: 3,
                  orderBy: {
                    type: 'column',
                    columnId: 'c3db85ad-ecfd-4b4d-b5bb-3b67684dbb35',
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
            },
            columnOrder: [
              'fe6434d9-db87-4e46-beb9-17413a21beb9',
              'db2eaa28-845f-4678-ae34-87de5fc99208',
              '2a498d57-f600-4720-9fad-9fb9ec7fd72b',
              'c3db85ad-ecfd-4b4d-b5bb-3b67684dbb35',
            ],
            incompleteColumns: {},
            sampling: 1,
          },
        },
      },
      // @ts-expect-error
      indexpattern: {
        layers: {},
      },
      textBased: {
        layers: {},
      },
    },
    internalReferences: [],
    adHocDataViews: {},
  },
  version: 2,
  references: [
    {
      type: 'index-pattern',
      id: '90943e30-9a47-11e8-b64d-95841ca0b247',
      name: 'indexpattern-datasource-layer-a08718f8-c67e-42d1-bbe3-ee1e6a457983',
    },
  ],
};
