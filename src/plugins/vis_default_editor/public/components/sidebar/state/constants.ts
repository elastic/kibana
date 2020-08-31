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

export enum EditorStateActionTypes {
  ADD_NEW_AGG = 'ADD_NEW_AGG',
  DISCARD_CHANGES = 'DISCARD_CHANGES',
  CHANGE_AGG_TYPE = 'CHANGE_AGG_TYPE',
  SET_AGG_PARAM_VALUE = 'SET_AGG_PARAM_VALUE',
  SET_STATE_PARAM_VALUE = 'SET_STATE_PARAM_VALUE',
  TOGGLE_ENABLED_AGG = 'TOGGLE_ENABLED_AGG',
  REMOVE_AGG = 'REMOVE_AGG',
  REORDER_AGGS = 'REORDER_AGGS',
  UPDATE_STATE_PARAMS = 'UPDATE_STATE_PARAMS',
}
