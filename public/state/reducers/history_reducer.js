import stateHistory from '../lib/state_history';

const history = stateHistory.create();

const historyReducer = reducer => (state, action) => {
  let newState = state;

  switch (action.type) {
    case 'HISTORY_UNDO':
      history.previous();
      break;

    case 'HISTORY_REDO':
      history.next();
      break;

    default:
      newState = reducer(state, action);
      history.push(newState.persistent);
  }

  return {
    ...newState,
    persistent: history.current,
    history: {
      hasPrevious: history.hasPrevious,
      hasNext: history.hasNext,
    },
  };
};

export default historyReducer;