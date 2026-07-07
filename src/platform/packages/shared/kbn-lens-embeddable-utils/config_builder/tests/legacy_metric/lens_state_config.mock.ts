/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LensAttributes } from '../../types';
import { LENS_ITEM_LATEST_VERSION } from '@kbn/lens-common/content_management/constants';

/**
 *  Simple legacy metric generated from kibana
 */
export const simpleLegacyMetricAttributes: LensAttributes = {
  title: 'Lens Legacy Metric',
  description: 'Median of Bytes',
  visualizationType: 'lnsLegacyMetric',
  state: {
    visualization: {
      layerId: '16c2ab17-6a5c-4b14-841c-f82b26c5d505',
      accessor: 'e6a05797-d41e-4f28-8768-98f7c8e81c6d',
      layerType: 'data',
      titlePosition: 'bottom',
      size: 'l',
    },
    query: {
      query: '',
      language: 'kuery',
    },
    filters: [],
    datasourceStates: {
      formBased: {
        layers: {
          '16c2ab17-6a5c-4b14-841c-f82b26c5d505': {
            columns: {
              'e6a05797-d41e-4f28-8768-98f7c8e81c6d': {
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
            columnOrder: ['e6a05797-d41e-4f28-8768-98f7c8e81c6d'],
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
  version: LENS_ITEM_LATEST_VERSION,
  references: [
    {
      type: 'index-pattern',
      id: '90943e30-9a47-11e8-b64d-95841ca0b247',
      name: 'indexpattern-datasource-layer-16c2ab17-6a5c-4b14-841c-f82b26c5d505',
    },
  ],
};

export const defaultColorByValueAttributes: LensAttributes = {
  title: 'Default color by value palette',
  description: '',
  state: {
    visualization: {
      layerId: '4153c826-5f82-4fb5-942b-5947250e8b58',
      accessor: '6ffc4622-070d-45ac-ba12-5089f2992217',
      layerType: 'data',
      colorMode: 'Background',
      palette: {
        type: 'palette',
        name: 'status',
        params: {
          name: 'status',
          reverse: false,
          rangeType: 'number',
          rangeMin: 0,
          rangeMax: 1.5,
          progression: 'fixed',
          // incorrect stops - set to lower bound values
          stops: [
            {
              color: '#24c292',
              stop: 0,
            },
            {
              color: '#fcd883',
              stop: 0.66,
            },
            {
              color: '#f6726a',
              stop: 1.33,
            },
          ],
          steps: 3,
          continuity: 'all',
          maxSteps: 5,
        },
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
          '4153c826-5f82-4fb5-942b-5947250e8b58': {
            columns: {
              '6ffc4622-070d-45ac-ba12-5089f2992217': {
                label: 'Count of records',
                dataType: 'number',
                operationType: 'count',
                isBucketed: false,
                sourceField: '___records___',
                params: {
                  // @ts-expect-error
                  emptyAsNull: true,
                },
              },
            },
            columnOrder: ['6ffc4622-070d-45ac-ba12-5089f2992217'],
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
  version: LENS_ITEM_LATEST_VERSION,
  visualizationType: 'lnsLegacyMetric',
  references: [
    {
      type: 'index-pattern',
      id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
      name: 'indexpattern-datasource-layer-4153c826-5f82-4fb5-942b-5947250e8b58',
    },
  ],
};

export const selectorColorByValueAttributes: LensAttributes = {
  title: 'selector color by value palette',
  description: '',
  state: {
    visualization: {
      layerId: '4153c826-5f82-4fb5-942b-5947250e8b58',
      accessor: '6ffc4622-070d-45ac-ba12-5089f2992217',
      layerType: 'data',
      colorMode: 'Background',
      palette: {
        type: 'palette',
        name: 'temperature',
        params: {
          name: 'temperature',
          reverse: false,
          rangeType: 'number',
          rangeMin: 0,
          rangeMax: null,
          progression: 'fixed',
          // incorrect stops - set to lower bound values
          stops: [
            {
              color: '#61a2ff',
              stop: 0,
            },
            {
              color: '#ebeff5',
              stop: 0.66,
            },
            {
              color: '#f6726a',
              stop: 1.33,
            },
          ],
          steps: 3,
          continuity: 'above',
          maxSteps: 5,
        },
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
          '4153c826-5f82-4fb5-942b-5947250e8b58': {
            columns: {
              '6ffc4622-070d-45ac-ba12-5089f2992217': {
                label: 'Count of records',
                dataType: 'number',
                operationType: 'count',
                isBucketed: false,
                sourceField: '___records___',
                params: {
                  // @ts-expect-error
                  emptyAsNull: true,
                },
              },
            },
            columnOrder: ['6ffc4622-070d-45ac-ba12-5089f2992217'],
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
  version: LENS_ITEM_LATEST_VERSION,
  visualizationType: 'lnsLegacyMetric',
  references: [
    {
      type: 'index-pattern',
      id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
      name: 'indexpattern-datasource-layer-4153c826-5f82-4fb5-942b-5947250e8b58',
    },
  ],
};

export const customColorByValueAttributes: LensAttributes = {
  visualizationType: 'lnsLegacyMetric',
  title: 'testing color by value palette',
  description: '',
  state: {
    datasourceStates: {
      formBased: {
        layers: {
          layer_0: {
            sampling: 1,
            ignoreGlobalFilters: false,
            columns: {
              legacy_metric_accessor: {
                operationType: 'count',
                sourceField: '___records___',
                dataType: 'number',
                isBucketed: false,
                label: '',
                customLabel: false,
                params: {
                  // @ts-expect-error
                  emptyAsNull: true,
                },
              },
            },
            columnOrder: ['legacy_metric_accessor'],
          },
        },
      },
    },
    internalReferences: [],
    visualization: {
      layerId: 'layer_0',
      layerType: 'data',
      accessor: 'legacy_metric_accessor',
      colorMode: 'Background',
      palette: {
        type: 'palette',
        name: 'custom',
        params: {
          name: 'custom',
          progression: 'fixed',
          reverse: false,
          rangeMin: 0,
          rangeMax: null,
          rangeType: 'number',
          stops: [
            {
              color: '#24c292',
              stop: 0,
            },
            {
              color: '#fcd883',
              stop: 3130.66,
            },
            {
              color: '#f6726a',
              stop: 4696,
            },
          ],
          continuity: 'above',
          steps: 3,
          maxSteps: 5,
        },
      },
    },
    adHocDataViews: {},
    query: {
      query: '',
      language: 'kuery',
    },
    filters: [],
  },
  version: LENS_ITEM_LATEST_VERSION,
  references: [
    {
      type: 'index-pattern',
      id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
      name: 'indexpattern-datasource-layer-layer_0',
    },
  ],
};
