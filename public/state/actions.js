import { createAction } from 'redux-actions';
import _ from 'lodash';
import elements from 'plugins/rework/elements/elements';


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

// Resolve all arguments on the element
export const elementResolveCommit = createAction('ELEMENT_RESOLVE_COMMIT', mutateWithId);

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

export function elementResolve(id) {
  return (dispatch, getState) => {
    const state = getState();
    const element = state.persistent.elements[id];
    const argDefinitions = elements.byName[element.type].args;
    const argPromises = _.map(argDefinitions, (argDef) => argDef.type.resolve(element.args[argDef.name]));

    Promise.all(argPromises).then((argValues) => {
      const argNames = _.map(argDefinitions, 'name');
      const resolvedArgs = _.zipObject(argNames, argValues);
      dispatch(elementResolveCommit(id, resolvedArgs));
    });
  };
}

window.elementResolve = elementResolve;
