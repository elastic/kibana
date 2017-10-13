import { handleActions } from 'redux-actions';

import {
  fetchedTimeFields,
} from '../actions/time_fields';

const defaultState = [];

export const timeFields = handleActions({
  [fetchedTimeFields](state, { payload }) {
    const { timeFields } = payload;
    return timeFields;
  }
}, defaultState);


export const getTimeFields = state => state;
