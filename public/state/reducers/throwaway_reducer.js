import { handleActions } from 'redux-actions';

const throwawayReducer = handleActions({
  EXPRESSION_SET: (throwawayState, action) => ({
    ...throwawayState,
    expression: action.payload,
  }),

  RENDERABLE_SET: (throwawayState, action) => ({
    ...throwawayState,
    renderable: action.payload,
  }),
}, {});

export default throwawayReducer;
