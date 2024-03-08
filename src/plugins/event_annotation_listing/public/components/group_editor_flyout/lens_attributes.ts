/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EventAnnotationGroupConfig } from '@kbn/event-annotation-common';
import { FieldBasedIndexPatternColumn, TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { XYPersistedByValueAnnotationLayerConfig } from '@kbn/lens-plugin/public/async_services';

export const DATA_LAYER_ID = 'data-layer-id';
export const DATE_HISTOGRAM_COLUMN_ID = 'date-histogram-column-id';
const ANNOTATION_LAYER_ID = 'annotation-layer-id';

export const getLensAttributes = (group: EventAnnotationGroupConfig, timeField: string) =>
  ({
    title: 'Line visualization with annotation layer', // TODO - should this be translated?
    description: '',
    visualizationType: 'lnsXY',
    type: 'lens',
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
            layerId: DATA_LAYER_ID,
            accessors: ['a7264a99-cd42-4b3f-855f-05364df71a71'],
            position: 'top',
            seriesType: 'line',
            showGridlines: false,
            layerType: 'data',
            xAccessor: [DATE_HISTOGRAM_COLUMN_ID],
          },
          {
            layerId: ANNOTATION_LAYER_ID,
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
            [DATA_LAYER_ID]: {
              columns: {
                [DATE_HISTOGRAM_COLUMN_ID]: {
                  label: 'timestamp',
                  dataType: 'date',
                  operationType: 'date_histogram',
                  sourceField: timeField,
                  isBucketed: true,
                  scale: 'interval',
                  params: {
                    interval: 'auto',
                    includeEmptyRows: true,
                    dropPartials: false,
                  },
                } as FieldBasedIndexPatternColumn,
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
                } as FieldBasedIndexPatternColumn,
              },
              columnOrder: [DATE_HISTOGRAM_COLUMN_ID, 'a7264a99-cd42-4b3f-855f-05364df71a71'],
              incompleteColumns: {},
              sampling: 1,
            },
          },
        },
        textBased: {
          layers: {},
        },
      },

      ...(group.dataViewSpec
        ? {
            internalReferences: [
              {
                type: 'index-pattern',
                id: group.dataViewSpec.id!,
                name: `indexpattern-datasource-layer-${DATA_LAYER_ID}`,
              },
              {
                type: 'index-pattern',
                id: group.dataViewSpec.id!,
                name: `xy-visualization-layer-${ANNOTATION_LAYER_ID}`,
              },
            ],
            adHocDataViews: {
              [group.dataViewSpec.id!]: group.dataViewSpec,
            },
          }
        : { internalReferences: [], adHocDataViews: {} }),
    },
    references: group.dataViewSpec
      ? []
      : [
          {
            type: 'index-pattern',
            id: group.indexPatternId,
            name: `indexpattern-datasource-layer-${DATA_LAYER_ID}`,
          },
        ],
  } as TypedLensByValueInput['attributes']);

export const getCurrentTimeField = (attributes: TypedLensByValueInput['attributes']) => {
  return (
    attributes.state.datasourceStates?.formBased?.layers[DATA_LAYER_ID].columns[
      DATE_HISTOGRAM_COLUMN_ID
    ] as FieldBasedIndexPatternColumn
  ).sourceField;
};
