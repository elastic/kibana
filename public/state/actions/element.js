import { createAction } from 'redux-actions';
import _ from 'lodash';
import elements from 'plugins/rework/elements/elements';
import { mutateWithId } from './lib/helpers';


export const elementHeight = createAction('ELEMENT_HEIGHT', mutateWithId);
export const elementWidth = createAction('ELEMENT_WIDTH', mutateWithId);
export const elementTop = createAction('ELEMENT_TOP', mutateWithId);
export const elementLeft = createAction('ELEMENT_LEFT', mutateWithId);
export const elementAngle = createAction('ELEMENT_ANGLE', mutateWithId);

// Resolve all arguments on the element
export const elementSetResolved = createAction('ELEMENT_SET_RESOLVED', mutateWithId);

export function elementResolve(id) {
  return (dispatch, getState) => {
    const state = getState();
    const element = state.persistent.elements[id];
    const argDefinitions = elements.byName[element.type].args;
    const argPromises = _.map(argDefinitions, (argDef) => argDef.type.resolve(element.args[argDef.name]));

    Promise.all(argPromises).then((argValues) => {
      const argNames = _.map(argDefinitions, 'name');
      const resolvedArgs = _.zipObject(argNames, argValues);
      dispatch(elementSetResolved(id, resolvedArgs));
    });
  };
}

window.elementResolve = elementResolve;
