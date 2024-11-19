/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
