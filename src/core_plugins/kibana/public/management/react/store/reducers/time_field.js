import { handleActions } from 'redux-actions';

import {
  selectTimeField,
} from '../actions/time_field';

const defaultState = {
  selected: undefined,
};

export const timeField = handleActions({
  [selectTimeField](state, { payload }) {
    const { timeField } = payload;
    return {
      ...state,
      selected: timeField,
    };
  }
}, defaultState);


export const getTimeField = state => state.selected;
