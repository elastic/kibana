import getInitialState from 'plugins/canvas/state/initial_state';
import { handleActions } from 'redux-actions';

const rootReducer = handleActions({
  EXPRESSION_SET: (state, action) => ({
    ...state,
    throwAway: {
      ...state.throwAway,
      expression: action.payload
    }
  }),

  RENDERABLE_SET: (state, action) => ({
    ...state,
    throwAway: {
      ...state.throwAway,
      renderable: action.payload
    }
  }),
}, getInitialState());

export default rootReducer;
