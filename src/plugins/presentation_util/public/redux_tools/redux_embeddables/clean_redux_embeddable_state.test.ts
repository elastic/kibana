/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EmbeddableInput } from '@kbn/embeddable-plugin/public';
import { Filter } from '@kbn/es-query';
import {
  cleanFiltersForSerialize,
  cleanInputForRedux,
  cleanStateForRedux,
  stateContainsFilters,
} from './clean_redux_embeddable_state';

type InputWithFilters = Partial<EmbeddableInput> & { filters: Filter[] };

describe('stateContainsFilters', () => {
  test('should return true if state contains filters', () => {
    const explicitInput: InputWithFilters = {
      id: 'wat',
      filters: [{ query: {}, meta: {} }],
    };

    expect(stateContainsFilters(explicitInput)).toBe(true);
  });

  test('should return false if state does not contain filters', () => {
    const explicitInput: EmbeddableInput = {
      id: 'wat',
    };

    expect(stateContainsFilters(explicitInput)).toBe(false);
  });
});

describe('cleanFiltersForSerialize', () => {
  test('should return an empty array if filters is not provided', () => {
    expect(cleanFiltersForSerialize()).toEqual([]);
  });

  test('should remove "meta.value" property from each filter', () => {
    const filters: Filter[] = [
      { query: { a: 'a' }, meta: { value: 'value1' } },
      { query: { b: 'b' }, meta: { value: 'value2' } },
    ];

    const cleanedFilters = cleanFiltersForSerialize(filters);

    expect(cleanedFilters[0]).toEqual({ query: { a: 'a' }, meta: {} });
    expect(cleanedFilters[1]).toEqual({ query: { b: 'b' }, meta: {} });
  });

  test('should not fail if meta is missing from filters', () => {
    const filters: Filter[] = [{ query: { a: 'a' } }, { query: { b: 'b' } }] as unknown as Filter[];

    const cleanedFilters = cleanFiltersForSerialize(filters as unknown as Filter[]);

    expect(cleanedFilters[0]).toEqual({ query: { a: 'a' } });
    expect(cleanedFilters[1]).toEqual({ query: { b: 'b' } });
  });
});

describe('cleanInputForRedux', () => {
  test('should clean filters to make explicit input serializable', () => {
    const explicitInput = {
      id: 'wat',
      filters: [
        { query: { a: 'a' }, meta: { value: 'value1' } },
        { query: { b: 'b' }, meta: { value: 'value2' } },
      ],
    };

    const cleanedInput = cleanInputForRedux(explicitInput) as InputWithFilters;

    expect(cleanedInput.filters[0]).toEqual({ query: { a: 'a' }, meta: {} });
    expect(cleanedInput.filters[1]).toEqual({ query: { b: 'b' }, meta: {} });
  });

  test('should not modify input if filters are not present', () => {
    const explicitInput = {
      id: 'wat',
      otherProp: 'value',
    };

    const cleanedInput = cleanInputForRedux(explicitInput);

    expect(cleanedInput).toEqual(explicitInput);
  });
});

describe('cleanStateForRedux', () => {
  test('should clean explicitInput for serializable state', () => {
    const state = {
      output: {},
      componentState: {},
      explicitInput: {
        id: 'wat',
        filters: [
          { query: { a: 'a' }, meta: { value: 'value1' } },
          { query: { b: 'b' }, meta: { value: 'value2' } },
        ],
      },
    };

    const cleanedState = cleanStateForRedux(state) as { explicitInput: InputWithFilters };

    expect(cleanedState.explicitInput.filters[0]).toEqual({ query: { a: 'a' }, meta: {} });
    expect(cleanedState.explicitInput.filters[1]).toEqual({ query: { b: 'b' }, meta: {} });
  });

  test('should not modify state if explicitInput filters are not present', () => {
    const state = {
      output: {},
      componentState: {},
      explicitInput: {
        id: 'wat',
        otherKey: 'value',
      },
    };

    const cleanedState = cleanStateForRedux(state);

    expect(cleanedState).toEqual(state);
  });
});
