import { handleActions } from 'redux-actions';

import {
  initData
} from '../actions/app';

const defaultState = {
  version: undefined,
  config: undefined,
};

export const app = handleActions({
  [initData](state, { payload: { version, config } }) {
    return {
      ...state,
      version,
      config,
    };
  }
}, defaultState);
