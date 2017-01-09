function rootReducer(state = {}, action) {
  const setTransient = (prop, value) => {
    return {...state, transient: {...state.transient, [prop]: value}};
  };

  const setPersistent = (prop, value) => {
    return {...state, transient: {...state.transient, [prop]: value}};
  };

  const setWorkpad = (prop, value) => {
    return setPersistent('workpad', {...state.persistent.workpad, [prop]: value});
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
    default:
      return state;
  }
}

export default rootReducer;
