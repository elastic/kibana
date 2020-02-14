/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { cloneDeep } from 'lodash';

import { Vis, VisState } from 'src/legacy/core_plugins/visualizations/public';
import { AggConfigs, IAggConfig, AggGroupNames } from '../../../legacy_imports';
import { EditorStateActionTypes } from './constants';
import { getEnabledMetricAggsCount } from '../../agg_group_helper';
import { EditorAction } from './actions';

function initEditorState(vis: Vis) {
  return vis.copyCurrentState(true);
}

function editorStateReducer(state: VisState, action: EditorAction): VisState {
  switch (action.type) {
    case EditorStateActionTypes.ADD_NEW_AGG: {
      const aggConfig = state.aggs.createAggConfig(action.payload as IAggConfig, {
        addToAggConfigs: false,
      });
      aggConfig.brandNew = true;
      const newAggs = [...state.aggs.aggs, aggConfig];

      return {
        ...state,
        aggs: new AggConfigs(state.aggs.indexPattern, newAggs, state.aggs.schemas),
      };
    }

    case EditorStateActionTypes.DISCARD_CHANGES: {
      return initEditorState(action.payload);
    }

    case EditorStateActionTypes.CHANGE_AGG_TYPE: {
      const { aggId, value } = action.payload;

      const newAggs = state.aggs.aggs.map(agg => {
        if (agg.id === aggId) {
          agg.type = value;

          return agg.toJSON();
        }

        return agg;
      });

      return {
        ...state,
        aggs: new AggConfigs(state.aggs.indexPattern, newAggs, state.aggs.schemas),
      };
    }

    case EditorStateActionTypes.SET_AGG_PARAM_VALUE: {
      const { aggId, paramName, value } = action.payload;

      const newAggs = state.aggs.aggs.map(agg => {
        if (agg.id === aggId) {
          const parsedAgg = agg.toJSON();

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
        aggs: new AggConfigs(state.aggs.indexPattern, newAggs, state.aggs.schemas),
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

      const newAggs = state.aggs.aggs.filter(({ id, schema }) => {
        if (id === action.payload.aggId) {
          if (schema.group === AggGroupNames.Metrics) {
            isMetric = true;
          }

          return false;
        }

        return true;
      });

      if (isMetric && getEnabledMetricAggsCount(newAggs) === 0) {
        const aggToEnable = newAggs.find(agg => agg.schema.name === 'metric');

        if (aggToEnable) {
          aggToEnable.enabled = true;
        }
      }

      return {
        ...state,
        aggs: new AggConfigs(state.aggs.indexPattern, newAggs, state.aggs.schemas),
      };
    }

    case EditorStateActionTypes.REORDER_AGGS: {
      const { sourceAgg, destinationAgg } = action.payload;
      const destinationIndex = state.aggs.aggs.indexOf(destinationAgg);
      const newAggs = [...state.aggs.aggs];
      newAggs.splice(destinationIndex, 0, newAggs.splice(state.aggs.aggs.indexOf(sourceAgg), 1)[0]);

      return {
        ...state,
        aggs: new AggConfigs(state.aggs.indexPattern, newAggs, state.aggs.schemas),
      };
    }

    case EditorStateActionTypes.TOGGLE_ENABLED_AGG: {
      const { aggId, enabled } = action.payload;

      const newAggs = state.aggs.aggs.map(agg => {
        if (agg.id === aggId) {
          const parsedAgg = agg.toJSON();

          return {
            ...parsedAgg,
            enabled,
          };
        }

        return agg;
      });

      return {
        ...state,
        aggs: new AggConfigs(state.aggs.indexPattern, newAggs, state.aggs.schemas),
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
}

export { editorStateReducer, initEditorState };
