const MIN_CONTEXT_SIZE = 0;

function QueryParameterActionCreatorsProvider(config) {
  const defaultSizeStep = parseInt(config.get('context:step'), 10);

  return {
    increasePredecessorCount,
    increaseSuccessorCount,
    setPredecessorCount,
    setSuccessorCount,
  };

  function increasePredecessorCount(value = defaultSizeStep) {
    return {
      type: 'context/increase_predecessor_count',
      payload: value,
    };
  }

  function increaseSuccessorCount(value = defaultSizeStep) {
    return {
      type: 'context/increase_successor_count',
      payload: value,
    };
  }

  function setPredecessorCount(value) {
    return {
      type: 'context/set_predecessor_count',
      payload: value,
    };
  }

  function setSuccessorCount(value) {
    return {
      type: 'context/set_successor_count',
      payload: value,
    };
  }
}

function selectPredecessorCount(state) {
  return state.queryParameters.predecessorCount;
}

function selectSuccessorCount(state) {
  return state.queryParameters.successorCount;
}

function updateQueryParameters(state, action) {
  switch (action.type) {
    case 'context/increase_predecessor_count':
      return { ...state, predecessorCount: Math.max(MIN_CONTEXT_SIZE, state.predecessorCount + action.payload) };
    case 'context/increase_successor_count':
      return { ...state, successorCount: Math.max(MIN_CONTEXT_SIZE, state.successorCount + action.payload) };
    case 'context/set_predecessor_count':
      return { ...state, predecessorCount: Math.max(MIN_CONTEXT_SIZE, action.payload) };
    case 'context/set_successor_count':
      return { ...state, successorCount: Math.max(MIN_CONTEXT_SIZE, action.payload) };
    default:
      return state;
  }
}


export {
  QueryParameterActionCreatorsProvider,
  selectPredecessorCount,
  selectSuccessorCount,
  updateQueryParameters,
};
