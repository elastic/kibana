import _ from 'lodash';


const MIN_CONTEXT_SIZE = 0;
const QUERY_PARAMETER_KEYS = [
  'anchorUid',
  'columns',
  'indexPattern',
  'predecessorCount',
  'successorCount',
  'sort',
];

function QueryParameterActionCreatorsProvider(config) {
  const defaultSizeStep = parseInt(config.get('context:step'), 10);

  return {
    increasePredecessorCount,
    increaseSuccessorCount,
    setPredecessorCount,
    setQueryParameters,
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

  function setQueryParameters(queryParameters) {
    return {
      type: 'context/set_query_parameters',
      payload: queryParameters,
    };
  }
}

function selectPredecessorCount(state) {
  return state.queryParameters.predecessorCount;
}

function selectQueryParameters(state) {
  return state.queryParameters;
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
    case 'context/set_query_parameters':
      return { ...state, ...(_.pick(action.payload, QUERY_PARAMETER_KEYS)) };
    default:
      return state;
  }
}


export {
  QueryParameterActionCreatorsProvider,
  QUERY_PARAMETER_KEYS,
  selectPredecessorCount,
  selectQueryParameters,
  selectSuccessorCount,
  updateQueryParameters,
};
