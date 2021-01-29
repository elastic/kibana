/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import _ from 'lodash';
import { esFilters } from '../../../../../../data/public';
import { popularizeField } from '../../../helpers/popularize_field';

import { MAX_CONTEXT_SIZE, MIN_CONTEXT_SIZE, QUERY_PARAMETER_KEYS } from './constants';

export function getQueryParameterActions(filterManager, indexPatterns) {
  const setPredecessorCount = (state) => (predecessorCount) =>
    (state.queryParameters.predecessorCount = clamp(
      MIN_CONTEXT_SIZE,
      MAX_CONTEXT_SIZE,
      predecessorCount
    ));

  const setSuccessorCount = (state) => (successorCount) =>
    (state.queryParameters.successorCount = clamp(
      MIN_CONTEXT_SIZE,
      MAX_CONTEXT_SIZE,
      successorCount
    ));

  const setQueryParameters = (state) => (queryParameters) =>
    Object.assign(state.queryParameters, _.pick(queryParameters, QUERY_PARAMETER_KEYS));

  const updateFilters = () => (filters) => {
    filterManager.setFilters(filters);
  };

  const addFilter = (state) => async (field, values, operation) => {
    const indexPatternId = state.queryParameters.indexPatternId;
    const newFilters = esFilters.generateFilters(
      filterManager,
      field,
      values,
      operation,
      indexPatternId
    );
    filterManager.addFilters(newFilters);
    if (indexPatterns) {
      const indexPattern = await indexPatterns.get(indexPatternId);
      await popularizeField(indexPattern, field.name, indexPatterns);
    }
  };

  return {
    addFilter,
    updateFilters,
    setPredecessorCount,
    setQueryParameters,
    setSuccessorCount,
  };
}

function clamp(minimum, maximum, value) {
  return Math.max(Math.min(maximum, value), minimum);
}
