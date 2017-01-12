import { createAction } from 'redux-actions';

export const editorClose = createAction('EDITOR_CLOSE');
export const editorOpen = createAction('EDITOR_OPEN');

export function editorToggle(payload) {
  return (dispatch, getState) => {
    const editorIsOpen = getState().transient.editor;
    const toggleAction = editorIsOpen ? editorClose() : editorOpen();
    dispatch(toggleAction);
  };
};
