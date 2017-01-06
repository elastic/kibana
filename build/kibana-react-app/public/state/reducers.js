function rootReducer(state = {}, action) {
  switch (action.type) {
    case 'ONE_ADD':
      return Object.assign({}, state, {
        counter: state.counter + 1
      });

    default:
      return state;
  }
}

export default rootReducer;
