import elements from 'plugins/rework/elements/elements';
import _ from 'lodash';

function rootReducer(state = {}, action) {
  const setTransient = (prop, value) => {
    return {...state, transient: {...state.transient, [prop]: value}};
  };

  const setPersistent = (prop, value) => {
    return {...state, persistent: {...state.persistent, [prop]: value}};
  };

  const setWorkpad = (prop, value) => {
    return setPersistent('workpad', {...state.persistent.workpad, [prop]: value});
  };

  const setPage = (id, prop, value) => {
    return setPersistent('pages', {
      ...state.persistent.pages,
      [id]: {
        ...state.persistent.pages[id],
        [prop]: value
      }});
  };

  const setElement = (id, prop, value) => {
    return setPersistent('elements', {
      ...state.persistent.elements,
      [id]: {
        ...state.persistent.elements[id],
        [prop]: value
      }});
  };

  // TODO: Move the resolving to an action.
  const resolveElement = (id) => {
    const element = state.persistent.elements[id];
    const argDefinitions = elements.byName[element.type].args;
    const argNames = _.map(argDefinitions, 'name');
    const argValues = _.map(argDefinitions, (argDef) => argDef.type.resolve(element.args[argDef.name]));
    const resolvedArgs = _.zipObject(argNames, argValues);
    return setTransient('resolvedArgs', {...state.transient.resolvedArgs, [id]: resolvedArgs});
  };

  const { payload, type } = action;
  switch (type) {
    case 'EDITOR_CLOSE':
      return setTransient('editor', false);
    case 'EDITOR_OPEN':
      return setTransient('editor', true);
    case 'WORKPAD_HEIGHT':
      return setWorkpad('height', payload);
    case 'WORKPAD_WIDTH':
      return setWorkpad('width', payload);
    case 'WORKPAD_PAGE':
      return setWorkpad('page', payload);

    case 'ELEMENT_ANGLE':
      return setElement(payload.id, 'angle', payload.value);
    case 'ELEMENT_HEIGHT':
      return setElement(payload.id, 'height', payload.value);
    case 'ELEMENT_WIDTH':
      return setElement(payload.id, 'width', payload.value);
    case 'ELEMENT_TOP':
      return setElement(payload.id, 'top', payload.value);
    case 'ELEMENT_LEFT':
      return setElement(payload.id, 'left', payload.value);
    case 'ELEMENT_RESOLVE':
      return resolveElement(payload);

    default:
      return state;
  }
}

export default rootReducer;
