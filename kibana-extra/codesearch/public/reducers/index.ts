/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { combineReducers } from 'redux';
import { Action, handleActions } from 'redux-actions';

import { decrease, increase } from '../actions';
import { repository, RepositoryState } from './repository';

interface CounterState {
  count: number;
}

const defaultState: CounterState = {
  count: 0,
};

export const counter = handleActions(
  {
    [String(increase)]: (state: CounterState, action: Action<number>) => {
      console.log('Receive increase action with payload: ' + action.payload); // tslint:disable-line no-console
      return {
        count: state.count + (action.payload || 0),
      };
    },
    [String(decrease)]: (state: CounterState, action: Action<number>) => {
      console.log('Receive decrease action with payload: ' + action.payload); // tslint:disable-line no-console
      return {
        count: state.count - (action.payload || 0),
      };
    },
  },
  defaultState
);

export interface RootState {
  counter: CounterState;
  repository: RepositoryState;
}

export const rootReducer = combineReducers({ counter, repository });
