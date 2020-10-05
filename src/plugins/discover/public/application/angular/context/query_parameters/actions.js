/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
