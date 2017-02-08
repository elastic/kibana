import stateHistory from '../lib/state_history';

const history = stateHistory.create();

const historyReducer = reducer => (state, action) => {
  let newState = state;

  switch (action.type) {
    case 'HISTORY_UNDO':
      history.back();
      break;

    case 'HISTORY_REDO':
      history.forward();
      break;

    default:
      newState = reducer(state, action);
      history.push(newState.persistent);
  }

  return {
    ...newState,
    persistent: history.current
  };
};

export default historyReducer;