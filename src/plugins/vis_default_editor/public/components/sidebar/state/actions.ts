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

import { Vis, VisParams } from 'src/plugins/visualizations/public';
import { IAggConfig } from 'src/plugins/data/public';
import { EditorStateActionTypes } from './constants';
import { Schema } from '../../../schemas';

export interface ActionType<T, P> {
  type: T;
  payload: P;
}

type AggId = IAggConfig['id'];
type AggParams = IAggConfig['params'];

type AddNewAgg = ActionType<EditorStateActionTypes.ADD_NEW_AGG, { schema: Schema }>;
type DiscardChanges = ActionType<EditorStateActionTypes.DISCARD_CHANGES, Vis>;
type ChangeAggType = ActionType<
  EditorStateActionTypes.CHANGE_AGG_TYPE,
  { aggId: AggId; value: IAggConfig['type'] }
>;
type SetAggParamValue<T extends AggParams = AggParams> = ActionType<
  EditorStateActionTypes.SET_AGG_PARAM_VALUE,
  {
    aggId: AggId;
    paramName: T;
    value: AggParams[T];
  }
>;
type SetStateParamValue<T extends keyof AggParams = keyof AggParams> = ActionType<
  EditorStateActionTypes.SET_STATE_PARAM_VALUE,
  { paramName: T; value: AggParams[T] }
>;
type RemoveAgg = ActionType<EditorStateActionTypes.REMOVE_AGG, { aggId: AggId; schemas: Schema[] }>;
type ReorderAggs = ActionType<
  EditorStateActionTypes.REORDER_AGGS,
  { sourceAgg: IAggConfig; destinationAgg: IAggConfig }
>;
type ToggleEnabledAgg = ActionType<
  EditorStateActionTypes.TOGGLE_ENABLED_AGG,
  { aggId: AggId; enabled: IAggConfig['enabled'] }
>;
type UpdateStateParams = ActionType<
  EditorStateActionTypes.UPDATE_STATE_PARAMS,
  { params: VisParams }
>;

export type EditorAction =
  | AddNewAgg
  | DiscardChanges
  | ChangeAggType
  | SetAggParamValue
  | SetStateParamValue
  | RemoveAgg
  | ReorderAggs
  | ToggleEnabledAgg
  | UpdateStateParams;

export interface EditorActions {
  addNewAgg(schema: Schema): AddNewAgg;
  discardChanges(vis: Vis): DiscardChanges;
  changeAggType(aggId: AggId, value: IAggConfig['type']): ChangeAggType;
  setAggParamValue<T extends keyof AggParams>(
    aggId: AggId,
    paramName: T,
    value: AggParams[T]
  ): SetAggParamValue<T>;
  setStateParamValue<T extends keyof AggParams>(
    paramName: T,
    value: AggParams[T]
  ): SetStateParamValue<T>;
  removeAgg(aggId: AggId, schemas: Schema[]): RemoveAgg;
  reorderAggs(sourceAgg: IAggConfig, destinationAgg: IAggConfig): ReorderAggs;
  toggleEnabledAgg(aggId: AggId, enabled: IAggConfig['enabled']): ToggleEnabledAgg;
  updateStateParams(params: VisParams): UpdateStateParams;
}

const addNewAgg: EditorActions['addNewAgg'] = (schema) => ({
  type: EditorStateActionTypes.ADD_NEW_AGG,
  payload: {
    schema,
  },
});

const discardChanges: EditorActions['discardChanges'] = (vis) => ({
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

const removeAgg: EditorActions['removeAgg'] = (aggId, schemas) => ({
  type: EditorStateActionTypes.REMOVE_AGG,
  payload: {
    aggId,
    schemas,
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

const updateStateParams: EditorActions['updateStateParams'] = (params) => ({
  type: EditorStateActionTypes.UPDATE_STATE_PARAMS,
  payload: {
    params,
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
  updateStateParams,
};
