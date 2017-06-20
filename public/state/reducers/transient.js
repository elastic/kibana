import { handleActions, combineActions } from 'redux-actions';
import { set, del } from 'object-path-immutable';
import { restoreHistory } from '../actions/history';
import * as actions from '../actions/transient';
import { setAst, setExpression, setArgumentAtIndex, removeElement } from '../actions/elements';

export default handleActions({
  [restoreHistory]: (transientState) => set(transientState, 'resolvedArgs', {}),

  [removeElement]: (transientState, { payload: { elementId } }) => {
    const { selectedElement } = transientState;
    return del({
      ...transientState,
      selectedElement: (selectedElement === elementId) ? null : selectedElement,
    }, ['resolvedArgs', elementId]);
  },

  [combineActions(setAst, setExpression, setArgumentAtIndex)]: (transientState, { payload }) => {
    const { element: { id: elementId } } = payload;
    return del(transientState, ['resolvedArgs', elementId, 'expressionRenderable']);
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
}, {});
