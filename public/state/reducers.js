function rootReducer(state = {}, action) {
  switch (action.type) {
    case 'EDITOR_CLOSE':
      return Object.assign({}, state, {
        transient: {editor: false}
      });
    case 'EDITOR_OPEN':
      return Object.assign({}, state, {
        transient: {editor: true}
      });

    default:
      return state;
  }
}

export default rootReducer;
