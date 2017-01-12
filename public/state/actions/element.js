import { createAction } from 'redux-actions';
import _ from 'lodash';
import elements from 'plugins/rework/elements/elements';
import { mutateWithId } from './lib/helpers';

/*
 Exports
*/

export const elementHeight = createAction('ELEMENT_HEIGHT', mutateWithId);
export const elementWidth = createAction('ELEMENT_WIDTH', mutateWithId);
export const elementTop = createAction('ELEMENT_TOP', mutateWithId);
export const elementLeft = createAction('ELEMENT_LEFT', mutateWithId);
export const elementAngle = createAction('ELEMENT_ANGLE', mutateWithId);
export const argumentResolved = createAction('ARGUMENT_RESOLVED', (id, name, value) => {
  return {id: id, name: name, value: value};
});

// Resolve all arguments at the same time
export function elementResolve(elementId) {
  return (dispatch, getState) => {
    const state = getState();
    const argDefinitions = getArgDefinitions(state, elementId);
    const argPromises = _.map(argDefinitions, argDef => resolveArgument(state, elementId, argDef.name));

    Promise.all(argPromises).then((argValues) => {
      const argNames = _.map(argDefinitions, 'name');
      const resolvedArgs = _.zipObject(argNames, argValues);
      _.each(resolvedArgs, (value, name) => {
        dispatch(argumentResolved(elementId, name, value));
      });
    });
  };
}

// Resolve one argument
export function argumentResolve(elementId, argName) {
  return (dispatch, getState) => {
    Promise.resolve(resolveArgument(getState(), elementId, argName)).then(argValue => {
      dispatch(argumentResolved(elementId, argName, argValue));
    });
  };
}

/*
  Utilities
*/

function getArgDefinitions(state, elementId) {
  const element = state.persistent.elements[elementId];
  const argDefinitions = elements.byName[element.type].args;
  return argDefinitions;
}

function resolveArgument(state, elementId, argName) {
  const element = state.persistent.elements[elementId];
  const argDef = _.find(getArgDefinitions(state, elementId), {name: argName});
  return argDef.type.resolve(element.args[argName]);
}

window.elementResolve = elementResolve;
