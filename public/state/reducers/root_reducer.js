import getInitialState from 'plugins/canvas/state/initial_state';

function rootReducer(state = getInitialState(), action) {
  const { payload, type, error } = action;
  switch (type) {
    default:
      return state;
  }
}

export default rootReducer;
