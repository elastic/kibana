import { handleActions } from 'redux-actions';

import {
  change,
  createItem,
} from '../actions/transient';

const defaultState = {};

export default handleActions({
  [createItem](state, { payload: { id, defaultData }}) {
    return {
      ...state,
      [id]: defaultData || {},
    }
  },
  // [change](state, { payload: { id, data } }) {
  //   return {
  //     ...state,
  //     [id]: {
  //       ...state[id],
  //       ...data
  //     },
  //   };
  // },
}, defaultState);
