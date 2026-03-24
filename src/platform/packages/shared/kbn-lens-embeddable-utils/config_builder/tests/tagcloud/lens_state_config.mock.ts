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
 * Simple tag cloud generated from kibana
 */
export const tagcloudAttributes = {
  title: 'Tagcloud',
  description: 'Days with the most average bytes',
  visualizationType: 'lnsTagcloud',
  state: {
    visualization: {
      layerId: 'c13b0057-467b-4286-80d3-8412d014730a',
      layerType: 'data',
      maxFontSize: 72,
      minFontSize: 18,
      orientation: 'single',
      showLabel: true,
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
      tagAccessor: 'ccf34934-e825-41f8-aebd-b16e7fbf5b6a',
      valueAccessor: '0306482f-c8ce-4782-b311-29a19ed3d408',
    },
    query: {
      query: '',
      language: 'kuery',
    },
    filters: [],
    datasourceStates: {
      formBased: {
        layers: {
          'c13b0057-467b-4286-80d3-8412d014730a': {
            columns: {
              'ccf34934-e825-41f8-aebd-b16e7fbf5b6a': {
                label: '@timestamp',
                dataType: 'date',
                operationType: 'date_histogram',
                sourceField: '@timestamp',
                isBucketed: true,
                params: {
                  // @ts-expect-error
                  interval: 'd',
                  includeEmptyRows: true,
                  dropPartials: false,
                },
              },
              '0306482f-c8ce-4782-b311-29a19ed3d408': {
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
            },
            columnOrder: [
              'ccf34934-e825-41f8-aebd-b16e7fbf5b6a',
              '0306482f-c8ce-4782-b311-29a19ed3d408',
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
      name: 'indexpattern-datasource-layer-c13b0057-467b-4286-80d3-8412d014730a',
    },
  ],
} satisfies LensAttributes;

/**
 * Tagcloud generated from kibana with full config
 */
export const tagcloudAttributesWithFullConfig = {
  title: 'Tagcloud with full config',
  visualizationType: 'lnsTagcloud',
  state: {
    visualization: {
      layerId: '020af0d6-cfa3-4c1b-a37c-8cb25dab94a7',
      layerType: 'data',
      maxFontSize: 53,
      minFontSize: 20,
      orientation: 'right angled',
      showLabel: false,
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
          type: 'gradient',
          steps: [
            {
              type: 'categorical',
              paletteId: 'default',
              colorIndex: 0,
              touched: false,
            },
          ],
          sort: 'desc',
        },
      },
      tagAccessor: 'bc844854-a7a5-4659-b3f8-1dc79c595092',
      valueAccessor: '738ba2e1-da5a-4fbd-bc2f-922e281b2471',
    },
    query: {
      query: '',
      language: 'kuery',
    },
    filters: [],
    datasourceStates: {
      formBased: {
        layers: {
          '020af0d6-cfa3-4c1b-a37c-8cb25dab94a7': {
            columns: {
              'bc844854-a7a5-4659-b3f8-1dc79c595092': {
                label: 'Top 5 values of geo.dest',
                dataType: 'string',
                operationType: 'terms',
                sourceField: 'geo.dest',
                isBucketed: true,
                params: {
                  // @ts-expect-error
                  size: 5,
                  orderBy: {
                    type: 'alphabetical',
                    fallback: true,
                  },
                  orderDirection: 'asc',
                  otherBucket: false,
                  missingBucket: false,
                  parentFormat: {
                    id: 'terms',
                  },
                  include: [],
                  exclude: [],
                  includeIsRegex: false,
                  excludeIsRegex: false,
                  secondaryFields: [],
                },
              },
              '738ba2e1-da5a-4fbd-bc2f-922e281b2471X0': {
                label: "Part of count(shift='1d')",
                dataType: 'number',
                operationType: 'count',
                isBucketed: false,
                sourceField: '___records___',
                timeShift: '1d',
                params: {
                  // @ts-expect-error
                  emptyAsNull: false,
                },
                customLabel: true,
              },
              '738ba2e1-da5a-4fbd-bc2f-922e281b2471': {
                label: "count(shift='1d')",
                dataType: 'number',
                operationType: 'formula',
                isBucketed: false,
                params: {
                  // @ts-expect-error
                  formula: "count(shift='1d')",
                  isFormulaBroken: false,
                },
                references: ['738ba2e1-da5a-4fbd-bc2f-922e281b2471X0'],
              },
            },
            columnOrder: [
              'bc844854-a7a5-4659-b3f8-1dc79c595092',
              '738ba2e1-da5a-4fbd-bc2f-922e281b2471',
              '738ba2e1-da5a-4fbd-bc2f-922e281b2471X0',
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
      name: 'indexpattern-datasource-layer-020af0d6-cfa3-4c1b-a37c-8cb25dab94a7',
    },
  ],
} satisfies LensAttributes;

/**
 * ESQL tagcloud generated from kibana
 */
export const tagcloudESQLAttributes = {
  title: 'ESQL Tagcloud',
  visualizationType: 'lnsTagcloud',
  state: {
    visualization: {
      layerId: 'ab578f6a-d0c2-4bf0-84a8-86c722d9b434',
      tagAccessor: 'geo.dest',
      valueAccessor: 'AVG(bytes)',
      maxFontSize: 54,
      minFontSize: 18,
      orientation: 'multiple',
      showLabel: true,
      colorMapping: {
        assignments: [],
        specialAssignments: [
          { rules: [{ type: 'other' }], color: { type: 'loop' }, touched: false },
        ],
        paletteId: 'default',
        colorMode: { type: 'categorical' },
      },
    },
    query: { esql: 'FROM kibana_sample_data_logsn| STATS AVG(bytes) BY geo.dest' },
    filters: [],
    datasourceStates: {
      textBased: {
        layers: {
          'ab578f6a-d0c2-4bf0-84a8-86c722d9b434': {
            index: 'e3465e67bdeced2befff9f9dca7ecf9c48504cad68a10efd881f4c7dd5ade28a',
            query: { esql: 'FROM kibana_sample_data_logsn| STATS AVG(bytes) BY geo.dest' },
            columns: [
              {
                columnId: 'AVG(bytes)',
                fieldName: 'AVG(bytes)',
                label: 'AVG(bytes)',
                customLabel: false,
                meta: { type: 'number', esType: 'double' },
                inMetricDimension: true,
              },
              {
                columnId: 'geo.dest',
                fieldName: 'geo.dest',
                label: 'geo.dest',
                customLabel: false,
                meta: { type: 'string', esType: 'keyword' },
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
        name: 'textBasedLanguages-datasource-layer-ab578f6a-d0c2-4bf0-84a8-86c722d9b434',
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
} satisfies LensAttributes;
