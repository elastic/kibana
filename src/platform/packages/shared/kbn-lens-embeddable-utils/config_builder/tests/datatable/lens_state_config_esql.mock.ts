/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { LensAttributes } from '../../types';

export const singleMetricESQLDatatableAttributes: LensAttributes = {
  title: 'Single metric datatable',
  references: [],
  state: {
    datasourceStates: {
      textBased: {
        layers: {
          '2f980b0d-7877-4ae2-9b0e-8cc3058d146d': {
            index: 'e3465e67bdeced2befff9f9dca7ecf9c48504cad68a10efd881f4c7dd5ade28a',
            query: { esql: 'FROM kibana_sample_data_logs | STATS COUNT(*) ' },
            columns: [
              {
                columnId: 'COUNT(*)',
                fieldName: 'COUNT(*)',
                label: 'COUNT(*)',
                customLabel: false,
                meta: { type: 'number', esType: 'long' },
                inMetricDimension: true,
              },
            ],
            timeField: '@timestamp',
          },
        },
        // @ts-expect-error
        indexPatternRefs: [
          {
            id: 'e3465e67bdeced2befff9f9dca7ecf9c48504cad68a10efd881f4c7dd5ade28a',
            title: 'kibana_sample_data_logs',
            timeField: '@timestamp',
          },
        ],
      },
    },
    filters: [],
    query: { esql: 'FROM kibana_sample_data_logs | STATS COUNT(*) ' },
    visualization: {
      layerId: '2f980b0d-7877-4ae2-9b0e-8cc3058d146d',
      layerType: 'data',
      columns: [{ columnId: 'COUNT(*)' }],
    },
    adHocDataViews: {
      e3465e67bdeced2befff9f9dca7ecf9c48504cad68a10efd881f4c7dd5ade28a: {
        id: 'e3465e67bdeced2befff9f9dca7ecf9c48504cad68a10efd881f4c7dd5ade28a',
        title: 'kibana_sample_data_logs',
        timeFieldName: '@timestamp',
        sourceFilters: [],
        type: 'esql',
        fieldFormats: {},
        runtimeFieldMap: {},
        allowNoIndex: false,
        name: 'kibana_sample_data_logs',
        allowHidden: false,
        managed: false,
      },
    },
    needsRefresh: false,
  },
  visualizationType: 'lnsDatatable',
  version: 2,
};

export const singleMetricRowSplitESQLDatatableAttributes: LensAttributes = {
  title: 'Single metric,row, split by datatable',
  references: [],
  state: {
    visualization: {
      layerId: '78c1e9e1-d568-4b86-b66e-011a5f1eb237',
      layerType: 'data',
      columns: [
        { columnId: 'bytes' },
        {
          columnId: '54fc46a6-bf5f-4a00-a60a-01e9ec5e1751',
          isTransposed: false,
          isMetric: false,
        },
        {
          columnId: '95b43b8b-a30f-40ed-8e6d-e7ea6d3add63',
          isTransposed: true,
          isMetric: false,
        },
      ],
    },
    query: { esql: 'FROM kibana_sample_data_logs | LIMIT 10' },
    filters: [],
    datasourceStates: {
      textBased: {
        layers: {
          '78c1e9e1-d568-4b86-b66e-011a5f1eb237': {
            index: 'e3465e67bdeced2befff9f9dca7ecf9c48504cad68a10efd881f4c7dd5ade28a',
            query: { esql: 'FROM kibana_sample_data_logs | LIMIT 10' },
            columns: [
              {
                columnId: 'bytes',
                fieldName: 'bytes',
                label: 'bytes',
                customLabel: false,
                meta: { type: 'number', esType: 'long' },
                inMetricDimension: true,
              },
              {
                columnId: '54fc46a6-bf5f-4a00-a60a-01e9ec5e1751',
                fieldName: 'geo.dest',
                meta: {
                  type: 'string',
                  esType: 'keyword',
                  sourceParams: {
                    indexPattern: 'kibana_sample_data_logs',
                    sourceField: 'geo.dest',
                  },
                  params: { id: 'string' },
                },
                label: 'geo.dest',
              },
              {
                columnId: '95b43b8b-a30f-40ed-8e6d-e7ea6d3add63',
                fieldName: 'agent.keyword',
                meta: {
                  type: 'string',
                  esType: 'keyword',
                  sourceParams: {
                    indexPattern: 'kibana_sample_data_logs',
                    sourceField: 'agent.keyword',
                  },
                  params: { id: 'string' },
                },
                label: 'agent.keyword',
              },
            ],
            timeField: '@timestamp',
          },
        },
      },
    },
    internalReferences: [
      {
        type: 'index-pattern',
        id: 'e3465e67bdeced2befff9f9dca7ecf9c48504cad68a10efd881f4c7dd5ade28a',
        name: 'textBasedLanguages-datasource-layer-78c1e9e1-d568-4b86-b66e-011a5f1eb237',
      },
    ],
    adHocDataViews: {
      e3465e67bdeced2befff9f9dca7ecf9c48504cad68a10efd881f4c7dd5ade28a: {
        id: 'e3465e67bdeced2befff9f9dca7ecf9c48504cad68a10efd881f4c7dd5ade28a',
        title: 'kibana_sample_data_logs',
        timeFieldName: '@timestamp',
        sourceFilters: [],
        type: 'esql',
        fieldFormats: {},
        runtimeFieldMap: {},
        allowNoIndex: false,
        name: 'kibana_sample_data_logs',
        allowHidden: false,
        managed: false,
      },
    },
  },
  visualizationType: 'lnsDatatable',
  version: 2,
};

export const multipleMetricRowSplitESQLDatatableAttributes: LensAttributes = {
  title: 'Multiple metrics, rows, split by datatable',
  references: [],
  state: {
    datasourceStates: {
      textBased: {
        layers: {
          '6a3b6914-09c5-4a98-9e92-335c2b75acf0': {
            index: 'e3465e67bdeced2befff9f9dca7ecf9c48504cad68a10efd881f4c7dd5ade28a',
            query: { esql: 'FROM kibana_sample_data_logs | LIMIT 10' },
            columns: [
              {
                columnId: 'bytes',
                fieldName: 'bytes',
                label: 'bytes',
                customLabel: false,
                meta: { type: 'number', esType: 'long' },
                inMetricDimension: true,
              },
              {
                columnId: 'bytes_counter',
                fieldName: 'bytes_counter',
                label: 'bytes_counter',
                customLabel: false,
                meta: { type: 'number', esType: 'long' },
                inMetricDimension: true,
              },
              {
                columnId: '921e25d6-07ed-47b1-806e-04b8c0772409',
                fieldName: '@timestamp',
                meta: {
                  type: 'date',
                  esType: 'date',
                  sourceParams: {
                    appliedTimeRange: {
                      from: '2025-12-17T10:00:00.000Z',
                      to: '2025-12-18T10:08:12.404Z',
                    },
                    params: {},
                    indexPattern: 'kibana_sample_data_logs',
                    sourceField: '@timestamp',
                  },
                  params: { id: 'date' },
                },
                label: '@timestamp',
              },
              {
                columnId: '8dde1a4c-fea6-4561-9cea-8814f3630919',
                fieldName: 'agent.keyword',
                meta: {
                  type: 'string',
                  esType: 'keyword',
                  sourceParams: {
                    indexPattern: 'kibana_sample_data_logs',
                    sourceField: 'agent.keyword',
                  },
                  params: { id: 'string' },
                },
                label: 'agent.keyword',
              },
              {
                columnId: '885de706-1cf5-4ea6-9fbd-18423e1e3e6e',
                fieldName: 'geo.src',
                meta: {
                  type: 'string',
                  esType: 'keyword',
                  sourceParams: {
                    indexPattern: 'kibana_sample_data_logs',
                    sourceField: 'geo.src',
                  },
                  params: { id: 'string' },
                },
                label: 'geo.src',
              },
              {
                columnId: '015699b6-78e3-4229-bddb-c7ca118ddfad',
                fieldName: 'geo.dest',
                meta: {
                  type: 'string',
                  esType: 'keyword',
                  sourceParams: {
                    indexPattern: 'kibana_sample_data_logs',
                    sourceField: 'geo.dest',
                  },
                  params: { id: 'string' },
                },
                label: 'geo.dest',
              },
            ],
            timeField: '@timestamp',
          },
        },
        // @ts-expect-error
        indexPatternRefs: [
          {
            id: 'e3465e67bdeced2befff9f9dca7ecf9c48504cad68a10efd881f4c7dd5ade28a',
            title: 'kibana_sample_data_logs',
            timeField: '@timestamp',
          },
        ],
      },
    },
    filters: [],
    query: { esql: 'FROM kibana_sample_data_logs | LIMIT 10' },
    visualization: {
      layerId: '6a3b6914-09c5-4a98-9e92-335c2b75acf0',
      layerType: 'data',
      columns: [
        { columnId: 'bytes' },
        { columnId: 'bytes_counter' },
        {
          columnId: '921e25d6-07ed-47b1-806e-04b8c0772409',
          isTransposed: false,
          isMetric: false,
        },
        {
          columnId: '8dde1a4c-fea6-4561-9cea-8814f3630919',
          isTransposed: false,
          isMetric: false,
        },
        {
          columnId: '885de706-1cf5-4ea6-9fbd-18423e1e3e6e',
          isTransposed: true,
          isMetric: false,
        },
        {
          columnId: '015699b6-78e3-4229-bddb-c7ca118ddfad',
          isTransposed: true,
          isMetric: false,
        },
      ],
    },
    adHocDataViews: {
      e3465e67bdeced2befff9f9dca7ecf9c48504cad68a10efd881f4c7dd5ade28a: {
        id: 'e3465e67bdeced2befff9f9dca7ecf9c48504cad68a10efd881f4c7dd5ade28a',
        title: 'kibana_sample_data_logs',
        timeFieldName: '@timestamp',
        sourceFilters: [],
        type: 'esql',
        fieldFormats: {},
        runtimeFieldMap: {},
        allowNoIndex: false,
        name: 'kibana_sample_data_logs',
        allowHidden: false,
        managed: false,
      },
    },
  },
  visualizationType: 'lnsDatatable',
  version: 2,
};

export const fullConfigESQLDatatableAttributes: LensAttributes = {
  title: 'Full config datatable',
  references: [],
  state: {
    visualization: {
      layerId: 'c5ae69a9-9358-4ea5-9dfd-414f31bd9cbb',
      layerType: 'data',
      columns: [
        { columnId: 'bytes' },
        {
          columnId: '8745342c-6490-4f71-9a8e-4eb81d4d4610',
          isTransposed: false,
          isMetric: false,
          alignment: 'right',
          hidden: true,
        },
        {
          columnId: 'c116b03e-fadc-4873-9dba-9d9998674dd4',
          isTransposed: true,
          isMetric: false,
        },
        {
          columnId: '4c0aea1c-365a-439c-8575-d8f2c79b72f3',
          isTransposed: false,
          isMetric: false,
          colorMode: 'text',
          colorMapping: {
            assignments: [],
            specialAssignments: [
              { rules: [{ type: 'other' }], color: { type: 'loop' }, touched: false },
            ],
            paletteId: 'default',
            colorMode: { type: 'categorical' },
          },
          palette: {
            type: 'palette',
            name: 'default',
            params: {
              stops: [
                { color: '#16c5c0', stop: 20 },
                { color: '#a6edea', stop: 40 },
                { color: '#61a2ff', stop: 60 },
                { color: '#bfdbff', stop: 80 },
                { color: '#ee72a6', stop: 100 },
              ],
            },
          },
        },
        {
          columnId: '37eccd9f-61fb-4b0d-b8cd-a811f335239b',
          isTransposed: true,
          isMetric: false,
        },
        {
          columnId: '49f28636-8375-4268-8aa4-242255dd9ec9',
          isTransposed: false,
          isMetric: true,
          colorMode: 'cell',
          palette: {
            type: 'palette',
            name: 'positive',
            params: {
              stops: [
                { color: '#d4efe6', stop: 20 },
                { color: '#b1e4d1', stop: 40 },
                { color: '#8cd9bb', stop: 60 },
                { color: '#62cea6', stop: 80 },
                { color: '#24c292', stop: 100 },
              ],
            },
          },
          summaryRow: 'count',
        },
      ],
      density: 'compact',
      headerRowHeightLines: 5,
      rowHeightLines: 4,
      paging: { enabled: true, size: 20 },
    },
    query: { esql: 'FROM kibana_sample_data_logs | LIMIT 10' },
    filters: [],
    datasourceStates: {
      textBased: {
        layers: {
          'c5ae69a9-9358-4ea5-9dfd-414f31bd9cbb': {
            index: 'e3465e67bdeced2befff9f9dca7ecf9c48504cad68a10efd881f4c7dd5ade28a',
            query: { esql: 'FROM kibana_sample_data_logs | LIMIT 10' },
            columns: [
              {
                columnId: 'bytes',
                fieldName: 'bytes',
                label: 'bytes',
                customLabel: false,
                meta: { type: 'number', esType: 'long' },
                inMetricDimension: true,
              },
              {
                columnId: '8745342c-6490-4f71-9a8e-4eb81d4d4610',
                fieldName: 'clientip',
                meta: {
                  type: 'ip',
                  esType: 'ip',
                  sourceParams: {
                    indexPattern: 'kibana_sample_data_logs',
                    sourceField: 'clientip',
                  },
                  params: { id: 'ip' },
                },
                label: 'clientip',
                customLabel: true,
              },
              {
                columnId: 'c116b03e-fadc-4873-9dba-9d9998674dd4',
                fieldName: 'geo.src',
                meta: {
                  type: 'string',
                  esType: 'keyword',
                  sourceParams: {
                    indexPattern: 'kibana_sample_data_logs',
                    sourceField: 'geo.src',
                  },
                  params: { id: 'string' },
                },
                label: 'geo.src',
                customLabel: true,
              },
              {
                columnId: '4c0aea1c-365a-439c-8575-d8f2c79b72f3',
                fieldName: '@timestamp',
                meta: {
                  type: 'date',
                  esType: 'date',
                  sourceParams: {
                    appliedTimeRange: {
                      from: '2025-12-18T08:57:50.595Z',
                      to: '2025-12-18T09:12:50.595Z',
                    },
                    params: {},
                    indexPattern: 'kibana_sample_data_logs',
                    sourceField: '@timestamp',
                  },
                  params: { id: 'date' },
                },
                label: '@timestamp',
              },
              {
                columnId: '37eccd9f-61fb-4b0d-b8cd-a811f335239b',
                fieldName: 'geo.dest',
                meta: {
                  type: 'string',
                  esType: 'keyword',
                  sourceParams: {
                    indexPattern: 'kibana_sample_data_logs',
                    sourceField: 'geo.dest',
                  },
                  params: { id: 'string' },
                },
                label: 'geo.dest',
                customLabel: true,
              },
              {
                columnId: '49f28636-8375-4268-8aa4-242255dd9ec9',
                fieldName: 'bytes_counter',
                meta: {
                  type: 'number',
                  esType: 'long',
                  sourceParams: {
                    indexPattern: 'kibana_sample_data_logs',
                    sourceField: 'bytes_counter',
                  },
                  params: { id: 'number' },
                },
                label: 'bytes_counter',
              },
            ],
            timeField: '@timestamp',
          },
        },
        // @ts-expect-error
        indexPatternRefs: [
          {
            id: 'e3465e67bdeced2befff9f9dca7ecf9c48504cad68a10efd881f4c7dd5ade28a',
            title: 'kibana_sample_data_logs',
            timeField: '@timestamp',
          },
        ],
      },
    },
    internalReferences: [
      {
        type: 'index-pattern',
        id: 'e3465e67bdeced2befff9f9dca7ecf9c48504cad68a10efd881f4c7dd5ade28a',
        name: 'textBasedLanguages-datasource-layer-c5ae69a9-9358-4ea5-9dfd-414f31bd9cbb',
      },
    ],
    adHocDataViews: {
      e3465e67bdeced2befff9f9dca7ecf9c48504cad68a10efd881f4c7dd5ade28a: {
        id: 'e3465e67bdeced2befff9f9dca7ecf9c48504cad68a10efd881f4c7dd5ade28a',
        title: 'kibana_sample_data_logs',
        timeFieldName: '@timestamp',
        sourceFilters: [],
        type: 'esql',
        fieldFormats: {},
        runtimeFieldMap: {},
        allowNoIndex: false,
        name: 'kibana_sample_data_logs',
        allowHidden: false,
        managed: false,
      },
    },
  },
  visualizationType: 'lnsDatatable',
  version: 2,
};

export const sortedByTransposedMetricColumnESQLDatatableAttributes: LensAttributes = {
  visualizationType: 'lnsDatatable',
  title: 'ESQL datatable sorted by transposed metric column',
  references: [],
  state: {
    visualization: {
      layerId: '1260255a-f8d8-4b9a-b36a-6dda4b978803',
      layerType: 'data',
      columns: [
        {
          columnId: 'bytes',
        },
        {
          columnId: 'bytes_counter',
        },
        {
          columnId: '7afdd0a5-a3b7-44b2-8a33-9ade7f7586af',
          isTransposed: false,
          isMetric: false,
        },
        {
          columnId: '4617d21a-3a89-403b-b952-68eb79739028',
          isTransposed: true,
          isMetric: false,
        },
        {
          columnId: 'bb07e1b7-2768-42e2-bad4-17abadb8b40b',
          isTransposed: true,
          isMetric: false,
        },
      ],
      sorting: {
        columnId: 'US---VN---bytes_counter',
        direction: 'desc',
      },
    },
    query: {
      esql: 'FROM kibana_sample_data_logs | LIMIT 10',
    },
    filters: [],
    datasourceStates: {
      textBased: {
        layers: {
          '1260255a-f8d8-4b9a-b36a-6dda4b978803': {
            index: 'e3465e67bdeced2befff9f9dca7ecf9c48504cad68a10efd881f4c7dd5ade28a',
            query: {
              esql: 'FROM kibana_sample_data_logs | LIMIT 10',
            },
            columns: [
              {
                columnId: 'bytes',
                fieldName: 'bytes',
                label: 'bytes',
                customLabel: false,
                meta: {
                  type: 'number',
                  esType: 'long',
                },
                inMetricDimension: true,
              },
              {
                columnId: 'bytes_counter',
                fieldName: 'bytes_counter',
                label: 'bytes_counter',
                customLabel: false,
                meta: {
                  type: 'number',
                  esType: 'long',
                },
                inMetricDimension: true,
              },
              {
                columnId: '7afdd0a5-a3b7-44b2-8a33-9ade7f7586af',
                fieldName: 'agent.keyword',
                meta: {
                  type: 'string',
                  esType: 'keyword',
                  sourceParams: {
                    indexPattern: 'kibana_sample_data_logs',
                    sourceField: 'agent.keyword',
                  },
                  params: {
                    id: 'string',
                  },
                },
                label: 'agent.keyword',
              },
              {
                columnId: '4617d21a-3a89-403b-b952-68eb79739028',
                fieldName: 'geo.src',
                meta: {
                  type: 'string',
                  esType: 'keyword',
                  sourceParams: {
                    indexPattern: 'kibana_sample_data_logs',
                    sourceField: 'geo.src',
                  },
                  params: {
                    id: 'string',
                  },
                },
                label: 'geo.src',
              },
              {
                columnId: 'bb07e1b7-2768-42e2-bad4-17abadb8b40b',
                fieldName: 'geo.dest',
                meta: {
                  type: 'string',
                  esType: 'keyword',
                  sourceParams: {
                    indexPattern: 'kibana_sample_data_logs',
                    sourceField: 'geo.dest',
                  },
                  params: {
                    id: 'string',
                  },
                },
                label: 'geo.dest',
              },
            ],
            timeField: '@timestamp',
          },
        },
      },
    },
    internalReferences: [
      {
        type: 'index-pattern',
        id: 'e3465e67bdeced2befff9f9dca7ecf9c48504cad68a10efd881f4c7dd5ade28a',
        name: 'textBasedLanguages-datasource-layer-1260255a-f8d8-4b9a-b36a-6dda4b978803',
      },
    ],
    adHocDataViews: {
      e3465e67bdeced2befff9f9dca7ecf9c48504cad68a10efd881f4c7dd5ade28a: {
        id: 'e3465e67bdeced2befff9f9dca7ecf9c48504cad68a10efd881f4c7dd5ade28a',
        title: 'kibana_sample_data_logs',
        timeFieldName: '@timestamp',
        sourceFilters: [],
        type: 'esql',
        fieldFormats: {},
        runtimeFieldMap: {},
        allowNoIndex: false,
        name: 'kibana_sample_data_logs',
        allowHidden: false,
        managed: false,
      },
    },
  },
  version: 2,
};
