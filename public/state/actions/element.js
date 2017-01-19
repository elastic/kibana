import { createAction } from 'redux-actions';
import _ from 'lodash';
import elements from 'plugins/rework/elements/elements';
import { mutateElement, mutateArgument } from './lib/helpers';

/*
 Exports
*/

export const elementSelect = createAction('ELEMENT_SELECT');
export const elementHeight = createAction('ELEMENT_HEIGHT', mutateElement);
export const elementWidth = createAction('ELEMENT_WIDTH', mutateElement);
export const elementTop = createAction('ELEMENT_TOP', mutateElement);
export const elementLeft = createAction('ELEMENT_LEFT', mutateElement);
export const elementAngle = createAction('ELEMENT_ANGLE', mutateElement);

export const argumentUnresolved = createAction('ARGUMENT_UNRESOLVED', mutateArgument);
export const argumentResolved = createAction('ARGUMENT_RESOLVED', mutateArgument);

// Resolve all arguments at the same time
export function elementResolve(elementId) {
  return (dispatch, getState) => {
    const state = getState();
    const argDefinitions = getArgDefinitions(state, elementId);
    const argPromises = _.map(argDefinitions, argDef => resolveArgument(state, elementId, argDef.name));

    Promise.all(argPromises).then((argValues) => {
      const argNames = _.map(argDefinitions, 'name');
      const elementCache = _.zipObject(argNames, argValues);
      _.each(elementCache, (value, name) => {
        dispatch(argumentResolved(elementId, name, value));
      });
    });
  };
}

export function argumentSet(elementId, name, value) {
  return (dispatch) => {
    dispatch(argumentUnresolved(elementId, name, value));
    dispatch(argumentResolve(elementId, name));
  };
}

// Resolve one argument
export function argumentResolve(elementId, name) {
  return (dispatch, getState) => {
    Promise.resolve(resolveArgument(getState(), elementId, name)).then(argValue => {
      dispatch(argumentResolved(elementId, name, argValue));
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

function resolveArgument(state, elementId, name) {
  const element = state.persistent.elements[elementId];
  const argDef = _.find(getArgDefinitions(state, elementId), {name: name});
  return argDef.type.resolve(element.args[name], state);
}

window.argumentSet = argumentSet;
