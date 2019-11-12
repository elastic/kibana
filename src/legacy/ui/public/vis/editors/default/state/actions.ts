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

import { AggConfig, Vis } from 'ui/vis';
import { EditorStateActionTypes } from './constants';
import { Schema } from '../schemas';

export interface ActionType<T, P> {
  type: T;
  payload: P;
}

type AggId = AggConfig['id'];
type AggParams = AggConfig['params'];

type AddNewAgg = ActionType<EditorStateActionTypes.ADD_NEW_AGG, { schema: Schema }>;
type DiscardChanges = ActionType<EditorStateActionTypes.DISCARD_CHANGES, Vis>;
type ChangeAggType = ActionType<
  EditorStateActionTypes.CHANGE_AGG_TYPE,
  { aggId: AggId; value: AggConfig['type'] }
>;
type SetAggParamValue<T extends AggParams = any> = ActionType<
  EditorStateActionTypes.SET_AGG_PARAM_VALUE,
  {
    aggId: AggId;
    paramName: T;
    value: AggParams[T];
  }
>;
type SetStateParamValue<T extends keyof AggParams = any> = ActionType<
  EditorStateActionTypes.SET_STATE_PARAM_VALUE,
  { paramName: T; value: AggParams[T] }
>;
type RemoveAgg = ActionType<EditorStateActionTypes.REMOVE_AGG, { aggId: AggId }>;
type ReorderAggs = ActionType<
  EditorStateActionTypes.REORDER_AGGS,
  { sourceAgg: AggConfig; destinationAgg: AggConfig }
>;
type ToggleEnabledAgg = ActionType<
  EditorStateActionTypes.TOGGLE_ENABLED_AGG,
  { aggId: AggId; enabled: AggConfig['enabled'] }
>;

export type EditorAction =
  | AddNewAgg
  | DiscardChanges
  | ChangeAggType
  | SetAggParamValue
  | SetStateParamValue
  | RemoveAgg
  | ReorderAggs
  | ToggleEnabledAgg;

export interface EditorActions {
  addNewAgg(schema: Schema): AddNewAgg;
  discardChanges(vis: Vis): DiscardChanges;
  changeAggType(aggId: AggId, value: AggConfig['type']): ChangeAggType;
  setAggParamValue<T extends keyof AggParams>(
    aggId: AggId,
    paramName: T,
    value: AggParams[T]
  ): SetAggParamValue<T>;
  setStateParamValue<T extends keyof AggParams>(
    paramName: T,
    value: AggParams[T]
  ): SetStateParamValue<T>;
  removeAgg(aggId: AggId): RemoveAgg;
  reorderAggs(sourceAgg: AggConfig, destinationAgg: AggConfig): ReorderAggs;
  toggleEnabledAgg(aggId: AggId, enabled: AggConfig['enabled']): ToggleEnabledAgg;
}

const addNewAgg: EditorActions['addNewAgg'] = schema => ({
  type: EditorStateActionTypes.ADD_NEW_AGG,
  payload: {
    schema,
  },
});

const discardChanges: EditorActions['discardChanges'] = vis => ({
  type: EditorStateActionTypes.DISCARD_CHANGES,
  payload: vis,
});

const changeAggType: EditorActions['changeAggType'] = (aggId, value) => ({
  type: EditorStateActionTypes.CHANGE_AGG_TYPE,
  payload: {
    aggId,
    value,
  },
});

const setAggParamValue: EditorActions['setAggParamValue'] = (aggId, paramName, value) => ({
  type: EditorStateActionTypes.SET_AGG_PARAM_VALUE,
  payload: {
    aggId,
    paramName,
    value,
  },
});

const setStateParamValue: EditorActions['setStateParamValue'] = (paramName, value) => ({
  type: EditorStateActionTypes.SET_STATE_PARAM_VALUE,
  payload: {
    paramName,
    value,
  },
});

const removeAgg: EditorActions['removeAgg'] = aggId => ({
  type: EditorStateActionTypes.REMOVE_AGG,
  payload: {
    aggId,
  },
});

const reorderAggs: EditorActions['reorderAggs'] = (sourceAgg, destinationAgg) => ({
  type: EditorStateActionTypes.REORDER_AGGS,
  payload: {
    sourceAgg,
    destinationAgg,
  },
});

const toggleEnabledAgg: EditorActions['toggleEnabledAgg'] = (aggId, enabled) => ({
  type: EditorStateActionTypes.TOGGLE_ENABLED_AGG,
  payload: {
    aggId,
    enabled,
  },
});

export {
  addNewAgg,
  discardChanges,
  changeAggType,
  setAggParamValue,
  setStateParamValue,
  removeAgg,
  reorderAggs,
  toggleEnabledAgg,
};
