import { handleActions } from 'redux-actions';
import { set, del } from 'object-path-immutable';
import { restoreHistory } from '../actions/history';
import * as actions from '../actions/transient';
import { removeElement } from '../actions/elements';
import { loadServerFunctionsComplete } from '../actions/app';

export default handleActions({
  [restoreHistory]: (transientState) => set(transientState, 'resolvedArgs', {}),

  [removeElement]: (transientState, { payload: { elementId } }) => {
    const { selectedElement } = transientState;
    return del({
      ...transientState,
      selectedElement: (selectedElement === elementId) ? null : selectedElement,
    }, ['resolvedArgs', elementId]);
  },

  [actions.setEditing]: (transientState, { payload }) => {
    return set(transientState, 'editing', payload);
  },

  [actions.selectElement]: (transientState, { payload }) => {
    return {
      ...transientState,
      selectedElement: payload || null,
    };
  },

  [loadServerFunctionsComplete]: (transientState, { payload }) => ({ ...transientState, serverFunctions: payload }),
}, {});
