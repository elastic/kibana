/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleActions } from 'redux-actions';
import { decrease, increase } from '../actions';

export interface RootState {
  count: number;
}

const defaultState: RootState = {
  count: 0,
};

const reducer = handleActions(
  {
    [String(increase)]: (state: RootState, action: any) => {
      console.log('Receive increase action with payload: ' + action.payload); // tslint:disable-line no-console
      return {
        count: state.count + action.payload,
      };
    },
    [String(decrease)]: (state: RootState, action: any) => {
      console.log('Receive decrease action with payload: ' + action.payload); // tslint:disable-line no-console
      return {
        count: state.count - action.payload,
      };
    },
  },
  defaultState
);

export default reducer;
