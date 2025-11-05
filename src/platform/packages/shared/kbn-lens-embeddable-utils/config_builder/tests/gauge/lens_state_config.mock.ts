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
  version: 1,
  references: [
    {
      type: 'index-pattern',
      id: '90943e30-9a47-11e8-b64d-95841ca0b247',
      name: 'indexpattern-datasource-layer-c08b068d-5170-487c-a1f9-656730c57b3b',
    },
  ],
};
