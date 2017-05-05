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

  RENDER_SET: (state, action) => ({
    ...state,
    throwAway: {
      ...state.throwAway,
      render: action.payload
    }
  }),
}, getInitialState());

export default rootReducer;
