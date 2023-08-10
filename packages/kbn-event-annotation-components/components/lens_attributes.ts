/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EventAnnotationGroupConfig } from '@kbn/event-annotation-common';
import { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { XYPersistedByValueAnnotationLayerConfig } from '@kbn/lens-plugin/public/async_services';

export const getLensAttributes = (group: EventAnnotationGroupConfig) =>
  ({
    title: 'Line visualization with annotation layer', // TODO - should this be translated?
    description: '',
    visualizationType: 'lnsXY',
    type: 'lens',
    references: [
      {
        type: 'index-pattern',
        id: group.indexPatternId,
        name: 'indexpattern-datasource-layer-67ba3d9d-b4fc-431a-a95e-69101e1dec46',
      },
    ],
    state: {
      visualization: {
        legend: {
          isVisible: true,
          position: 'right',
        },
        valueLabels: 'hide',
        fittingFunction: 'None',
        axisTitlesVisibilitySettings: {
          x: true,
          yLeft: true,
          yRight: true,
        },
        tickLabelsVisibilitySettings: {
          x: true,
          yLeft: true,
          yRight: true,
        },
        labelsOrientation: {
          x: 0,
          yLeft: 0,
          yRight: 0,
        },
        gridlinesVisibilitySettings: {
          x: true,
          yLeft: true,
          yRight: true,
        },
        preferredSeriesType: 'line',
        layers: [
          {
            layerId: '67ba3d9d-b4fc-431a-a95e-69101e1dec46',
            accessors: ['a7264a99-cd42-4b3f-855f-05364df71a71'],
            position: 'top',
            seriesType: 'line',
            showGridlines: false,
            layerType: 'data',
            xAccessor: 'e9e2d5e2-0910-4a3b-8735-c8fe37efd7ac',
          },
          {
            layerId: '2df639d4-7143-477a-b7ac-a487431c7e33',
            layerType: 'annotations',
            persistanceType: 'byValue',
            ...group,
          } as XYPersistedByValueAnnotationLayerConfig,
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
            '67ba3d9d-b4fc-431a-a95e-69101e1dec46': {
              columns: {
                'e9e2d5e2-0910-4a3b-8735-c8fe37efd7ac': {
                  label: 'timestamp',
                  dataType: 'date',
                  operationType: 'date_histogram',
                  sourceField: 'timestamp',
                  isBucketed: true,
                  scale: 'interval',
                  params: {
                    interval: 'auto',
                    includeEmptyRows: true,
                    dropPartials: false,
                  },
                },
                'a7264a99-cd42-4b3f-855f-05364df71a71': {
                  label: 'Count of records',
                  dataType: 'number',
                  operationType: 'count',
                  isBucketed: false,
                  scale: 'ratio',
                  sourceField: '___records___',
                  params: {
                    emptyAsNull: true,
                  },
                },
              },
              columnOrder: [
                'e9e2d5e2-0910-4a3b-8735-c8fe37efd7ac',
                'a7264a99-cd42-4b3f-855f-05364df71a71',
              ],
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
  } as TypedLensByValueInput['attributes']);
