/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LensAttributes } from '../../types';

/**
 *  Gauge generated from kibana
 */
export const gaugeAttributes: LensAttributes = {
  title: 'Gauge full config',
  visualizationType: 'lnsGauge',
  state: {
    visualization: {
      layerId: 'c08b068d-5170-487c-a1f9-656730c57b3b',
      layerType: 'data',
      shape: 'horizontalBullet',
      palette: {
        name: 'custom',
        type: 'palette',
        params: {
          steps: 4,
          name: 'custom',
          reverse: false,
          rangeType: 'number',
          rangeMin: 4156,
          rangeMax: null,
          progression: 'fixed',
          stops: [
            {
              color: '#24c292',
              stop: 5044,
            },
            {
              color: '#aee8d2',
              stop: 5932,
            },
            {
              color: '#ffc9c2',
              stop: 6820,
            },
            {
              color: '#f6726a',
              stop: 7708,
            },
          ],
          continuity: 'above',
          maxSteps: 5,
          colorStops: [
            {
              color: '#24c292',
              stop: 4156,
            },
            {
              color: '#aee8d2',
              stop: 5044,
            },
            {
              color: '#ffc9c2',
              stop: 5932,
            },
            {
              color: '#f6726a',
              stop: 6820,
            },
          ],
        },
      },
      ticksPosition: 'bands',
      labelMajorMode: 'auto',
      labelMinor: 'Bytes Subtitle',
      metricAccessor: '2ba2f501-1bca-4423-95b8-a5b92b05f5f5',
      colorMode: 'palette',
      minAccessor: 'a2ed356d-14fe-4066-9428-cec4a453cb7b',
      maxAccessor: '40d2a0bb-8244-4c73-93ca-05100f44959a',
      goalAccessor: '2659361b-0f92-4c9f-ac36-16297a9a360e',
    },
    query: {
      query: '',
      language: 'kuery',
    },
    filters: [],
    datasourceStates: {
      formBased: {
        layers: {
          'c08b068d-5170-487c-a1f9-656730c57b3b': {
            columns: {
              '2ba2f501-1bca-4423-95b8-a5b92b05f5f5': {
                label: 'Average of bytes',
                dataType: 'number',
                operationType: 'average',
                sourceField: 'bytes',
                isBucketed: false,
                params: {
                  // @ts-expect-error
                  emptyAsNull: true,
                },
              },
              'a2ed356d-14fe-4066-9428-cec4a453cb7bX0': {
                label: 'Part of round(average(bytes) - 1000)',
                dataType: 'number',
                operationType: 'average',
                sourceField: 'bytes',
                isBucketed: false,
                params: {
                  // @ts-expect-error
                  emptyAsNull: false,
                },
                customLabel: true,
              },
              'a2ed356d-14fe-4066-9428-cec4a453cb7bX1': {
                label: 'Part of round(average(bytes) - 1000)',
                dataType: 'number',
                operationType: 'math',
                isBucketed: false,
                params: {
                  // @ts-expect-error
                  tinymathAst: {
                    type: 'function',
                    name: 'round',
                    args: [
                      {
                        type: 'function',
                        name: 'subtract',
                        args: ['a2ed356d-14fe-4066-9428-cec4a453cb7bX0', 1000],
                        location: {
                          min: 6,
                          max: 27,
                        },
                        text: 'average(bytes) - 1000',
                      },
                    ],
                    location: {
                      min: 0,
                      max: 28,
                    },
                    text: 'round(average(bytes) - 1000)',
                  },
                },
                references: ['a2ed356d-14fe-4066-9428-cec4a453cb7bX0'],
                customLabel: true,
              },
              'a2ed356d-14fe-4066-9428-cec4a453cb7b': {
                label: 'round(average(bytes) - 1000)',
                dataType: 'number',
                operationType: 'formula',
                isBucketed: false,
                params: {
                  // @ts-expect-error
                  formula: 'round(average(bytes) - 1000)',
                  isFormulaBroken: false,
                },
                references: ['a2ed356d-14fe-4066-9428-cec4a453cb7bX1'],
              },
              '2659361b-0f92-4c9f-ac36-16297a9a360e': {
                label: 'Static value: 7000',
                dataType: 'number',
                operationType: 'static_value',
                isBucketed: false,
                params: {
                  // @ts-expect-error
                  value: '7000',
                },
                references: [],
              },
              '40d2a0bb-8244-4c73-93ca-05100f44959a': {
                label: 'Maximum of bytes',
                dataType: 'number',
                operationType: 'max',
                sourceField: 'bytes',
                isBucketed: false,
                params: {
                  // @ts-expect-error
                  emptyAsNull: true,
                },
              },
            },
            columnOrder: [
              '2ba2f501-1bca-4423-95b8-a5b92b05f5f5',
              'a2ed356d-14fe-4066-9428-cec4a453cb7b',
              'a2ed356d-14fe-4066-9428-cec4a453cb7bX0',
              'a2ed356d-14fe-4066-9428-cec4a453cb7bX1',
              '2659361b-0f92-4c9f-ac36-16297a9a360e',
              '40d2a0bb-8244-4c73-93ca-05100f44959a',
            ],
            sampling: 1,
            ignoreGlobalFilters: false,
            incompleteColumns: {},
          },
        },
      },
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
      name: 'indexpattern-datasource-layer-c08b068d-5170-487c-a1f9-656730c57b3b',
    },
  ],
};

/**
 *  Gauge generated from kibana with percentage color mode
 */
export const gaugeAttributesWithPercentageColorMode: LensAttributes = {
  title: 'Gauge full config with percentage color mode',
  visualizationType: 'lnsGauge',
  description: 'Gauge full config with percentage color mode',
  state: {
    visualization: {
      shape: 'arc',
      layerId: '0c83ba66-2a5b-47d6-9a5b-5b91786ee6f4',
      layerType: 'data',
      ticksPosition: 'auto',
      labelMajorMode: 'auto',
      metricAccessor: '7328e798-7f14-4a3e-9cba-525910be67d4',
      palette: {
        type: 'palette',
        name: 'status',
        params: {
          name: 'status',
          reverse: false,
          rangeType: 'percent',
          rangeMin: 0,
          rangeMax: null,
          progression: 'fixed',
          stops: [
            {
              color: '#24c292',
              stop: 0,
            },
            {
              color: '#aee8d2',
              stop: 25,
            },
            {
              color: '#ffc9c2',
              stop: 50,
            },
            {
              color: '#f6726a',
              stop: 75,
            },
          ],
          steps: 4,
          continuity: 'above',
          maxSteps: 5,
        },
      },
      colorMode: 'palette',
    },
    query: {
      query: '',
      language: 'kuery',
    },
    filters: [],
    datasourceStates: {
      formBased: {
        layers: {
          '0c83ba66-2a5b-47d6-9a5b-5b91786ee6f4': {
            columns: {
              '7328e798-7f14-4a3e-9cba-525910be67d4': {
                label: 'Median of bytes',
                dataType: 'number',
                operationType: 'median',
                sourceField: 'bytes',
                isBucketed: false,
                params: {
                  // @ts-expect-error
                  emptyAsNull: true,
                },
              },
            },
            columnOrder: ['7328e798-7f14-4a3e-9cba-525910be67d4'],
            incompleteColumns: {},
            sampling: 1,
          },
        },
      },
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
      name: 'indexpattern-datasource-layer-0c83ba66-2a5b-47d6-9a5b-5b91786ee6f4',
    },
  ],
};

/**
 *  ESQL Gauge generated from kibana
 */
export const gaugeESQLAttributes: LensAttributes = {
  title: 'ESQL Gauge full config',
  visualizationType: 'lnsGauge',
  state: {
    visualization: {
      shape: 'circle',
      layerId: '13bab0dc-1cf2-4342-8599-097f94455119',
      layerType: 'data',
      ticksPosition: 'auto',
      labelMajorMode: 'auto',
      metricAccessor: 'average',
      minAccessor: '7300f2d7-a68c-4baa-8aa6-82486f73c08c',
      maxAccessor: '62dd9334-ca5f-4edd-952f-ef6c01f3f728',
      goalAccessor: 'fc9aa5bf-df9b-40e6-8919-903605702130',
      palette: {
        type: 'palette',
        name: 'complementary',
        params: {
          name: 'complementary',
          reverse: false,
          rangeType: 'number',
          rangeMin: 5353,
          rangeMax: null,
          progression: 'fixed',
          stops: [
            { color: '#61a2ff', stop: 5353 },
            { color: '#accefe', stop: 7927.95 },
            { color: '#f0d47f', stop: 10502.9 },
            { color: '#eaae01', stop: 13077.84 },
          ],
          steps: 4,
          continuity: 'above',
          maxSteps: 5,
        },
      },
      colorMode: 'palette',
    },
    query: {
      esql: 'FROM kibana_sample_data_logs n| EVAL max = 50n| STATS average=avg(bytes), min=min(bytes), max=avg(bytes)*2, goal=max(bytes)',
    },
    filters: [],
    datasourceStates: {
      textBased: {
        layers: {
          '13bab0dc-1cf2-4342-8599-097f94455119': {
            index: 'e3465e67bdeced2befff9f9dca7ecf9c48504cad68a10efd881f4c7dd5ade28a',
            query: {
              esql: 'FROM kibana_sample_data_logs n| EVAL max = 50n| STATS average=avg(bytes), min=min(bytes), max=avg(bytes)*2, goal=max(bytes)',
            },
            columns: [
              {
                columnId: 'average',
                fieldName: 'average',
                label: 'average',
                customLabel: false,
                meta: { type: 'number', esType: 'double' },
                inMetricDimension: true,
              },
              {
                columnId: 'min',
                fieldName: 'min',
                label: 'min',
                customLabel: false,
                meta: { type: 'number', esType: 'long' },
                inMetricDimension: true,
              },
              {
                columnId: 'max',
                fieldName: 'max',
                label: 'max',
                customLabel: false,
                meta: { type: 'number', esType: 'long' },
                inMetricDimension: true,
              },
              {
                columnId: '7300f2d7-a68c-4baa-8aa6-82486f73c08c',
                fieldName: 'min',
                meta: {
                  type: 'number',
                  esType: 'long',
                  sourceParams: { indexPattern: 'kibana_sample_data_logs', sourceField: 'min' },
                  params: { id: 'number' },
                },
                label: 'min',
              },
              {
                columnId: '62dd9334-ca5f-4edd-952f-ef6c01f3f728',
                fieldName: 'max',
                meta: {
                  type: 'number',
                  esType: 'long',
                  sourceParams: { indexPattern: 'kibana_sample_data_logs', sourceField: 'max' },
                  params: { id: 'number' },
                },
                label: 'max',
              },
              {
                columnId: 'fc9aa5bf-df9b-40e6-8919-903605702130',
                fieldName: 'goal',
                meta: {
                  type: 'number',
                  esType: 'long',
                  sourceParams: {
                    indexPattern: 'kibana_sample_data_logs',
                    sourceField: 'goal',
                  },
                  params: { id: 'number' },
                },
                label: 'goal',
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
        name: 'textBasedLanguages-datasource-layer-13bab0dc-1cf2-4342-8599-097f94455119',
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
  references: [],
};
