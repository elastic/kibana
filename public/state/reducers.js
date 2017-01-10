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

  switch (action.type) {
    case 'EDITOR_CLOSE':
      return setTransient('editor', false);
    case 'EDITOR_OPEN':
      return setTransient('editor', true);
    case 'WORKPAD_HEIGHT':
      return setWorkpad('height', action.payload);
    case 'WORKPAD_WIDTH':
      return setWorkpad('width', action.payload);
    case 'WORKPAD_PAGE':
      return setWorkpad('page', action.payload);

    case 'ELEMENT_ANGLE':
      return setElement(action.payload.id, 'angle', action.payload.angle);

    default:
      return state;
  }
}

export default rootReducer;
