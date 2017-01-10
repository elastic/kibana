import { createAction } from 'redux-actions';

export const editorClose = createAction('EDITOR_CLOSE');
export const editorOpen = createAction('EDITOR_OPEN');

export const workpadHeight = createAction('WORKPAD_HEIGHT');
export const workpadWidth = createAction('WORKPAD_WIDTH');
export const workpadPage = createAction('WORKPAD_PAGE');

export const elementPosition = createAction('ELEMENT_POSITION');
export const elementSize = createAction('ELEMENT_POSITION');
export const elementAngle = createAction('ELEMENT_POSITION');

// You can return a promise here too.
export function editorToggle(payload) {
  return (dispatch, getState) => {
    const editorIsOpen = getState().transient.editor;
    const toggleAction = editorIsOpen ? editorClose() : editorOpen();
    dispatch(toggleAction);
  };
};

export function workpadPageNext() {
  return (dispatch, getState) => {
    const {page, pages} = getState().persistent.workpad;
    const newPage = page + 1;
    if (newPage < pages.length) dispatch(workpadPage(newPage));
  };
}

export function workpadPagePrevious() {
  return (dispatch, getState) => {
    const {page, pages} = getState().persistent.workpad;
    const newPage = page - 1;
    if (newPage >= 0) dispatch(workpadPage(newPage));
  };
}
