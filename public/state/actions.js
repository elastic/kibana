import { createAction } from 'redux-actions';

export const editorClose = createAction('EDITOR_CLOSE');
export const editorOpen = createAction('EDITOR_OPEN');

// You can return a promise here too.
export function editorToggle(payload) {
  return (dispatch, getState) => {
    const editorIsOpen = getState().transient.editor;
    if (editorIsOpen) {
      dispatch(editorClose());
    } else {
      dispatch(editorOpen());
    }
  };
};
