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

export interface ActionType {
  type: EditorStateActionTypes;
  payload: {
    [key: string]: any;
  };
}

export interface EditorActions {
  addNewAgg(schema: Schema): ActionType;
  discardChanges(vis: Vis): ActionType;
  changeAggType(aggId: AggConfig['id'], value: AggConfig['type']): ActionType;
  setAggParamValue<T extends keyof AggConfig['params']>(
    aggId: AggConfig['id'],
    paramName: T,
    value: AggConfig['params'][T]
  ): ActionType;
  setStateParamValue<T extends keyof AggConfig['params']>(
    paramName: T,
    value: AggConfig['params'][T]
  ): ActionType;
  removeAgg(aggId: AggConfig['id']): ActionType;
  toggleEnabledAgg(aggId: AggConfig['id'], enabled: AggConfig['enabled']): ActionType;
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

const toggleEnabledAgg: EditorActions['toggleEnabledAgg'] = (aggId, enabled) => ({
  type: EditorStateActionTypes.TOGGLE_ENABLED_AGG,
  payload: {
    aggId,
    enabled,
  },
});

export const editorActions: EditorActions = {
  addNewAgg,
  discardChanges,
  changeAggType,
  setAggParamValue,
  setStateParamValue,
  removeAgg,
  toggleEnabledAgg,
};
