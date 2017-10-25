import { handleActions } from 'redux-actions';
import { setWorkpad, sizeWorkpad, setColors, setName } from '../actions/workpad';

export const workpadReducer = handleActions({
  [setWorkpad]: (workpadState, { payload }) => {
    return payload;
  },

  [sizeWorkpad]: (workpadState, { payload }) => {
    return { ...workpadState, ...payload };
  },

  [setColors]: (workpadState, { payload }) => {
    return { ...workpadState, colors: payload };
  },

  [setName]: (workpadState, { payload }) => {
    return { ...workpadState, name: payload };
  },
}, {});
