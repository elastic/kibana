import { createAction } from 'redux-actions';

export const editorClose = createAction('EDITOR_CLOSE');
export const editorOpen = createAction('EDITOR_OPEN');

export const workpadHeight = createAction('WORKPAD_HEIGHT');
export const workpadWidth = createAction('WORKPAD_WIDTH');
export const workpadPage = createAction('WORKPAD_PAGE');


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
