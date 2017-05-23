import { handleActions } from 'redux-actions';
import { set } from 'object-path-immutable';
import * as actions from '../actions/app';

const app = handleActions({
  [actions.setEditing]: (transientState, { payload }) => {
    return set(transientState, 'editing', payload);
  },
}, {});

export default app;
