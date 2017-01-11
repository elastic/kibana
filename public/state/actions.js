import { createAction } from 'redux-actions';

export const editorClose = createAction('EDITOR_CLOSE');
export const editorOpen = createAction('EDITOR_OPEN');

export const workpadHeight = createAction('WORKPAD_HEIGHT');
export const workpadWidth = createAction('WORKPAD_WIDTH');
export const workpadPage = createAction('WORKPAD_PAGE');

const mutateWithId = (id, value) => {return {id: id, value: value};};
export const elementHeight = createAction('ELEMENT_HEIGHT', mutateWithId);
export const elementWidth = createAction('ELEMENT_WIDTH', mutateWithId);
export const elementTop = createAction('ELEMENT_TOP', mutateWithId);
export const elementLeft = createAction('ELEMENT_LEFT', mutateWithId);
export const elementAngle = createAction('ELEMENT_ANGLE', mutateWithId);


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
