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

function QueryParameterActionsProvider(config) {
  const defaultSizeStep = parseInt(config.get('context:step'), 10);

  const setPredecessorCount = (state) => (predecessorCount) => (
    state.queryParameters.predecessorCount = Math.max(
      MIN_CONTEXT_SIZE,
      predecessorCount,
    )
  );

  const increasePredecessorCount = (state) => (value = defaultSizeStep) => (
    setPredecessorCount(state)(state.queryParameters.predecessorCount + value)
  );

  const setSuccessorCount = (state) => (successorCount) => (
    state.queryParameters.successorCount = Math.max(
      MIN_CONTEXT_SIZE,
      successorCount,
    )
  );

  const increaseSuccessorCount = (state) => (value = defaultSizeStep) => (
    setSuccessorCount(state)(state.queryParameters.successorCount + value)
  );

  const setQueryParameters = (state) => (queryParameters) => (
    state.queryParameters = {
      ...state.queryParameters,
      ...(_.pick(queryParameters, QUERY_PARAMETER_KEYS)),
    }
  );

  return {
    increasePredecessorCount,
    increaseSuccessorCount,
    setPredecessorCount,
    setQueryParameters,
    setSuccessorCount,
  };
}


export {
  QueryParameterActionsProvider,
  QUERY_PARAMETER_KEYS,
};
