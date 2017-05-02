import getInitialState from 'plugins/canvas/state/initial_state';

function rootReducer(state = getInitialState(), { type }) {
  switch (type) {
    default:
      return state;
  }
}

export default rootReducer;
