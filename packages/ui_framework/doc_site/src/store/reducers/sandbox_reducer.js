import ActionTypes from '../../actions/action_types';

const defaultState = {
  isSandbox: false,
};

export default function sandboxReducer(state = defaultState, action) {
  switch (action.type) {
    case ActionTypes.OPEN_SANDBOX: {
      return Object.assign({}, state, {
        isSandbox: true,
      });
    }

    case ActionTypes.CLOSE_SANDBOX: {
      return Object.assign({}, state, {
        isSandbox: false,
      });
    }

    default:
      break;
  }

  return state;
}
