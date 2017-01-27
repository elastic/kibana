import { createAction } from 'redux-actions';
import _ from 'lodash';
import elementTypes from 'plugins/rework/elements/elements';
import { mutateElement, mutateArgument } from './lib/helpers';
import { getElementTemplate } from '../templates';

/*
 Exports
*/

export const elementSelect = createAction('ELEMENT_SELECT');
export const elementHeight = createAction('ELEMENT_HEIGHT', mutateElement);
export const elementWidth = createAction('ELEMENT_WIDTH', mutateElement);
export const elementTop = createAction('ELEMENT_TOP', mutateElement);
export const elementLeft = createAction('ELEMENT_LEFT', mutateElement);
export const elementAngle = createAction('ELEMENT_ANGLE', mutateElement);
export const elementRemove = createAction('ELEMENT_REMOVE', (elementId, pageId) => {return {elementId, pageId};});
export const elementLayer = createAction('ELEMENT_LAYER', (elementId, pageId, layer) => {return {elementId, pageId, layer};});


export const argumentUnresolved = createAction('ARGUMENT_UNRESOLVED', mutateArgument);
export const argumentResolved = createAction('ARGUMENT_RESOLVED', mutateArgument);

export function elementAdd(type, pageId) {
  return (dispatch, getState) => {
    const elementType = elementTypes.byName[type];
    const args = _.fromPairs(
      _.map(elementType.args, arg => {
        const argDefault = _.isFunction(arg.default) ? arg.default(getState()) : arg.default;
        return [arg.name, argDefault];
      }));
    const element = getElementTemplate({type: elementType.name, args: args});
    const action = createAction('ELEMENT_ADD', (element, pageId) => {return {element, pageId};});
    dispatch(action(element, pageId));
    dispatch(elementResolve(element.id));
  };
}

// Because it has to find the page(s)...grrr, the element is on.
export function elementRemoveSlowly(elementId) {
  return (dispatch, getState) => {
    _.each(getState().persistent.pages, page => {
      if (_.includes(page.elements, elementId)) {
        dispatch(elementRemove(elementId, page.id));
      }
    });
  };
}

export function elementLayerMove(elementId, pageId, movement) {
  return (dispatch, getState) => {
    const elementIdList = getState().persistent.pages[pageId].elements;
    const elementIndex = elementIdList.indexOf(elementId);
    if (elementIndex < 0) return;

    let newIndex;
    switch (movement) {
      case '++':
        newIndex = elementIdList.length - 1;
        break;
      case '+':
        if (elementIndex === elementIdList.length - 1) return;
        newIndex = elementIndex + 1;
        break;
      case '-':
        if (elementIndex === 0) return;
        newIndex = elementIndex - 1;
        break;
      case '--':
        if (elementIndex === 0) return;
        newIndex = 0;
        break;
      default:
        return;
    }
    dispatch(elementLayer(elementId, pageId, newIndex));
  };
}

export function elementResolveAll() {
  return (dispatch, getState) => {
    const ids = _.keys(getState().persistent.elements);
    _.each(ids, id => dispatch(elementResolve(id)));
  };
}

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
  const argDefinitions = elementTypes.byName[element.type].args;
  return argDefinitions;
}

function resolveArgument(state, elementId, name) {
  const element = state.persistent.elements[elementId];
  const argDef = _.find(getArgDefinitions(state, elementId), {name: name});
  return argDef.type.resolve(element.args[name], state);
}
