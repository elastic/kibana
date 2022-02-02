/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { cloneDeep } from 'lodash';

import { Vis } from 'src/plugins/visualizations/public';
import { AggGroupNames, DataPublicPluginStart } from '../../../../../data/public';
import { EditorStateActionTypes } from './constants';
import { getEnabledMetricAggsCount } from '../../agg_group_helper';
import { EditorAction } from './actions';

function initEditorState(vis: Vis) {
  return {
    ...vis.clone(),
  };
}

export type EditorVisState = Pick<Vis, 'title' | 'description' | 'type' | 'params' | 'data'>;

const createEditorStateReducer =
  ({ aggs: { createAggConfigs } }: DataPublicPluginStart['search']) =>
  (state: EditorVisState, action: EditorAction): EditorVisState => {
    switch (action.type) {
      case EditorStateActionTypes.ADD_NEW_AGG: {
        const { schema } = action.payload;
        const defaultConfig =
          !state.data.aggs!.aggs.find((agg) => agg.schema === schema.name) && schema.defaults
            ? (schema as any).defaults.slice(0, schema.max)
            : { schema: schema.name };
        const aggConfig = state.data.aggs!.createAggConfig(defaultConfig, {
          addToAggConfigs: false,
        });
        aggConfig.brandNew = true;
        const newAggs = [...state.data.aggs!.aggs, aggConfig];

        return {
          ...state,
          data: {
            ...state.data,
            aggs: createAggConfigs(state.data.indexPattern!, newAggs),
          },
        };
      }

      case EditorStateActionTypes.DISCARD_CHANGES: {
        return initEditorState(action.payload);
      }

      case EditorStateActionTypes.CHANGE_AGG_TYPE: {
        const { aggId, value } = action.payload;

        const newAggs = state.data.aggs!.aggs.map((agg) => {
          if (agg.id === aggId) {
            agg.type = value;

            return agg.serialize();
          }

          return agg;
        });

        return {
          ...state,
          data: {
            ...state.data,
            aggs: createAggConfigs(state.data.indexPattern!, newAggs),
          },
        };
      }

      case EditorStateActionTypes.SET_AGG_PARAM_VALUE: {
        const { aggId, paramName, value } = action.payload;

        const newAggs = state.data.aggs!.aggs.map((agg) => {
          if (agg.id === aggId) {
            const parsedAgg = agg.serialize();

            return {
              ...parsedAgg,
              params: {
                ...parsedAgg.params,
                [paramName]: value,
              },
            };
          }

          return agg;
        });

        return {
          ...state,
          data: {
            ...state.data,
            aggs: createAggConfigs(state.data.indexPattern!, newAggs),
          },
        };
      }

      case EditorStateActionTypes.SET_STATE_PARAM_VALUE: {
        const { paramName, value } = action.payload;

        return {
          ...state,
          params: {
            ...state.params,
            [paramName]: value,
          },
        };
      }

      case EditorStateActionTypes.REMOVE_AGG: {
        let isMetric = false;
        const newAggs = state.data.aggs!.aggs.filter(({ id, schema }) => {
          if (id === action.payload.aggId) {
            const schemaDef = action.payload.schemas.find((s) => s.name === schema);
            if (schemaDef && schemaDef.group === AggGroupNames.Metrics) {
              isMetric = true;
            }

            return false;
          }

          return true;
        });

        if (isMetric && getEnabledMetricAggsCount(newAggs) === 0) {
          const aggToEnable = newAggs.find((agg) => agg.schema === 'metric');

          if (aggToEnable) {
            aggToEnable.enabled = true;
          }
        }

        return {
          ...state,
          data: {
            ...state.data,
            aggs: createAggConfigs(state.data.indexPattern!, newAggs),
          },
        };
      }

      case EditorStateActionTypes.REORDER_AGGS: {
        const { sourceAgg, destinationAgg } = action.payload;
        const destinationIndex = state.data.aggs!.aggs.indexOf(destinationAgg);
        const newAggs = [...state.data.aggs!.aggs];
        newAggs.splice(
          destinationIndex,
          0,
          newAggs.splice(state.data.aggs!.aggs.indexOf(sourceAgg), 1)[0]
        );

        return {
          ...state,
          data: {
            ...state.data,
            aggs: createAggConfigs(state.data.indexPattern!, newAggs),
          },
        };
      }

      case EditorStateActionTypes.TOGGLE_ENABLED_AGG: {
        const { aggId, enabled } = action.payload;

        const newAggs = state.data.aggs!.aggs.map((agg) => {
          if (agg.id === aggId) {
            const parsedAgg = agg.serialize();

            return {
              ...parsedAgg,
              enabled,
            };
          }

          return agg;
        });

        return {
          ...state,
          data: {
            ...state.data,
            aggs: createAggConfigs(state.data.indexPattern!, newAggs),
          },
        };
      }

      case EditorStateActionTypes.UPDATE_STATE_PARAMS: {
        const { params } = action.payload;

        return {
          ...state,
          params: cloneDeep(params),
        };
      }
    }
  };

export { createEditorStateReducer, initEditorState };
