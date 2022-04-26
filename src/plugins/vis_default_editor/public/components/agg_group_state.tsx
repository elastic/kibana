/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IAggConfig } from '@kbn/data-plugin/public';

export enum AGGS_ACTION_KEYS {
  TOUCHED = 'aggsTouched',
  VALID = 'aggsValid',
}

interface AggsItem {
  touched: boolean;
  valid: boolean;
}

export interface AggsState {
  [aggId: string]: AggsItem;
}

export interface AggsAction {
  type: AGGS_ACTION_KEYS;
  payload: boolean;
  aggId: string;
  newState?: AggsState;
}

function aggGroupReducer(state: AggsState, action: AggsAction): AggsState {
  const aggState = state[action.aggId] || { touched: false, valid: true };
  switch (action.type) {
    case AGGS_ACTION_KEYS.TOUCHED:
      return { ...state, [action.aggId]: { ...aggState, touched: action.payload } };
    case AGGS_ACTION_KEYS.VALID:
      return { ...state, [action.aggId]: { ...aggState, valid: action.payload } };
    default:
      throw new Error();
  }
}

function initAggsState(group: IAggConfig[]): AggsState {
  return group.reduce((state, agg) => {
    state[agg.id] = { touched: false, valid: true };
    return state;
  }, {} as AggsState);
}

export { aggGroupReducer, initAggsState };
