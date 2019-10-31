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

import { EditorStateActionTypes } from './constants';

const addNewAgg = schema => ({
  type: EditorStateActionTypes.ADD_NEW_AGG,
  payload: {
    schema,
  },
});

const discardChanges = vis => ({
  type: EditorStateActionTypes.DISCARD_CHANGES,
  payload: vis,
});

const changeAggType = (aggId, value) => ({
  type: EditorStateActionTypes.CHANGE_AGG_TYPE,
  payload: {
    aggId,
    value,
  },
});

const setAggParamValue = (aggId, paramName, value) => ({
  type: EditorStateActionTypes.SET_AGG_PARAM_VALUE,
  payload: {
    aggId,
    paramName,
    value,
  },
});

const setStateParamValue = (paramName, value) => ({
  type: EditorStateActionTypes.SET_STATE_PARAM_VALUE,
  payload: {
    paramName,
    value,
  },
});

export { addNewAgg, discardChanges, changeAggType, setAggParamValue, setStateParamValue };
