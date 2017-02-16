import _ from 'lodash';

import {
  MAX_CONTEXT_SIZE,
  MIN_CONTEXT_SIZE,
  QUERY_PARAMETER_KEYS,
} from './constants';


export function QueryParameterActionsProvider() {
  const setPredecessorCount = (state) => (predecessorCount) => (
    state.queryParameters.predecessorCount = clamp(
      MIN_CONTEXT_SIZE,
      MAX_CONTEXT_SIZE,
      predecessorCount,
    )
  );

  const increasePredecessorCount = (state) => (
    value = state.queryParameters.defaultStepSize,
  ) => (
    setPredecessorCount(state)(state.queryParameters.predecessorCount + value)
  );

  const setSuccessorCount = (state) => (successorCount) => (
    state.queryParameters.successorCount = clamp(
      MIN_CONTEXT_SIZE,
      MAX_CONTEXT_SIZE,
      successorCount,
    )
  );

  const increaseSuccessorCount = (state) => (
    value = state.queryParameters.defaultStepSize,
  ) => (
    setSuccessorCount(state)(state.queryParameters.successorCount + value)
  );

  const setQueryParameters = (state) => (queryParameters) => (
    Object.assign(
      state.queryParameters,
      _.pick(queryParameters, QUERY_PARAMETER_KEYS),
    )
  );

  return {
    increasePredecessorCount,
    increaseSuccessorCount,
    setPredecessorCount,
    setQueryParameters,
    setSuccessorCount,
  };
}

function clamp(minimum, maximum, value) {
  return Math.max(Math.min(maximum, value), minimum);
}
