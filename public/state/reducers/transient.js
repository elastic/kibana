import { handleActions } from 'redux-actions';
import { set } from 'object-path-immutable';
import { restoreHistory } from '../actions/history';
import * as actions from '../actions/transient';

export default handleActions({
  [restoreHistory]: (transientState) => set(transientState, 'resolvedArgs', {}),

  [actions.setEditing]: (transientState, { payload }) => {
    return set(transientState, 'editing', payload);
  },

  [actions.selectElement]: (transientState, { payload }) => {
    return {
      ...transientState,
      selectedElement: payload || null,
    };
  },
}, {});
