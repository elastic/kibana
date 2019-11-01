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

const addNewAgg = (schema: Schema) => ({
  type: EditorStateActionTypes.ADD_NEW_AGG,
  payload: {
    schema,
  },
});

const discardChanges = (vis: Vis) => ({
  type: EditorStateActionTypes.DISCARD_CHANGES,
  payload: vis,
});

const changeAggType = (aggId: AggConfig['id'], value: AggConfig['type']) => ({
  type: EditorStateActionTypes.CHANGE_AGG_TYPE,
  payload: {
    aggId,
    value,
  },
});

const setAggParamValue = <T extends keyof AggConfig['params']>(
  aggId: AggConfig['id'],
  paramName: T,
  value: AggConfig['params'][T]
) => ({
  type: EditorStateActionTypes.SET_AGG_PARAM_VALUE,
  payload: {
    aggId,
    paramName,
    value,
  },
});

const setStateParamValue = <T extends keyof AggConfig['params']>(
  paramName: T,
  value: AggConfig['params'][T]
) => ({
  type: EditorStateActionTypes.SET_STATE_PARAM_VALUE,
  payload: {
    paramName,
    value,
  },
});

const removeAgg = (aggId: AggConfig['id']) => ({
  type: EditorStateActionTypes.REMOVE_AGG,
  payload: {
    aggId,
  },
});

const toggleEnabledAgg = (aggId: AggConfig['id'], enabled: AggConfig['enabled']) => ({
  type: EditorStateActionTypes.TOGGLE_ENABLED_AGG,
  payload: {
    aggId,
    enabled,
  },
});

export const editorActions = {
  addNewAgg,
  discardChanges,
  changeAggType,
  setAggParamValue,
  setStateParamValue,
  removeAgg,
  toggleEnabledAgg,
};
