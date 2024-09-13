/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Filter } from '@kbn/es-query';
import { EmbeddableInput } from '@kbn/embeddable-plugin/public';

import { ReduxEmbeddableState } from './types';

// TODO: Make filters serializable so we don't need special treatment for them.
type InputWithFilters = Partial<EmbeddableInput> & { filters: Filter[] };
export const stateContainsFilters = (
  state: Partial<EmbeddableInput>
): state is InputWithFilters => {
  if ((state as InputWithFilters).filters && (state as InputWithFilters).filters.length > 0)
    return true;
  return false;
};

export const cleanFiltersForSerialize = (filters?: Filter[]): Filter[] => {
  if (!filters) return [];
  return filters.map((filter) => {
    if (filter.meta?.value) delete filter.meta.value;
    return filter;
  });
};

export const cleanInputForRedux = <
  ReduxEmbeddableStateType extends ReduxEmbeddableState = ReduxEmbeddableState
>(
  explicitInput: ReduxEmbeddableStateType['explicitInput']
) => {
  if (stateContainsFilters(explicitInput)) {
    explicitInput.filters = cleanFiltersForSerialize(explicitInput.filters);
  }
  return explicitInput;
};

export const cleanStateForRedux = <
  ReduxEmbeddableStateType extends ReduxEmbeddableState = ReduxEmbeddableState
>(
  state: ReduxEmbeddableStateType
) => {
  // clean explicit input
  state.explicitInput = cleanInputForRedux<ReduxEmbeddableStateType>(state.explicitInput);
  return state;
};
