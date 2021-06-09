/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { pick } from 'lodash';

import {
  IndexPatternsContract,
  FilterManager,
  esFilters,
  Filter,
  IndexPatternField,
} from '../../../../../../data/public';
import { popularizeField } from '../../../helpers/popularize_field';
import { ContextAppState, QueryParameters } from '../../context_app_state';
import { MAX_CONTEXT_SIZE, MIN_CONTEXT_SIZE, QUERY_PARAMETER_KEYS } from './constants';

export function getQueryParameterActions(
  filterManager: FilterManager,
  indexPatterns?: IndexPatternsContract
) {
  const setPredecessorCount = (state: ContextAppState) => (predecessorCount: number) => {
    return (state.queryParameters.predecessorCount = clamp(
      MIN_CONTEXT_SIZE,
      MAX_CONTEXT_SIZE,
      predecessorCount
    ));
  };

  const setSuccessorCount = (state: ContextAppState) => (successorCount: number) => {
    return (state.queryParameters.successorCount = clamp(
      MIN_CONTEXT_SIZE,
      MAX_CONTEXT_SIZE,
      successorCount
    ));
  };

  const setQueryParameters = (state: ContextAppState) => (queryParameters: QueryParameters) => {
    return Object.assign(state.queryParameters, pick(queryParameters, QUERY_PARAMETER_KEYS));
  };

  const updateFilters = () => (filters: Filter[]) => {
    filterManager.setFilters(filters);
  };

  const addFilter = (state: ContextAppState) => async (
    field: IndexPatternField | string,
    values: unknown,
    operation: string
  ) => {
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
      const fieldName = typeof field === 'string' ? field : field.name;
      await popularizeField(indexPattern, fieldName, indexPatterns);
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

function clamp(minimum: number, maximum: number, value: number) {
  return Math.max(Math.min(maximum, value), minimum);
}
