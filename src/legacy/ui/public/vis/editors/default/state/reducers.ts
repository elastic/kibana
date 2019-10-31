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

import { AggConfigs } from 'ui/agg_types';
import { Vis } from 'ui/vis';
import { EditorStateActionTypes } from './constants';

function initEditorState(vis: Vis) {
  return vis.copyCurrentState(true);
}

function editorStateReducer(state, action) {
  switch (action.type) {
    case EditorStateActionTypes.ADD_NEW_AGG: {
      const newAggs = [...state.aggs.aggs, state.aggs.createAggConfig(action.payload)];

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
          const parsedAgg = agg.toJSON();

          return {
            ...parsedAgg,
            type: value,
          };
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
  }
}

export { editorStateReducer, initEditorState };
