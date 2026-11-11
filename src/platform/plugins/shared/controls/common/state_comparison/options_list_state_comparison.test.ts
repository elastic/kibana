/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEFAULT_DSL_OPTIONS_LIST_STATE } from '@kbn/controls-constants';
import type { OptionsListDSLControlState } from '@kbn/controls-schemas';
import { areComparatorsEqual } from '@kbn/presentation-publishing';
import { optionsListStateComparison } from './options_list_state_comparison';

const buildState = (state: Partial<OptionsListDSLControlState> = {}) =>
  ({
    data_view_id: 'data-view',
    field_name: 'host',
    ...state,
  } as OptionsListDSLControlState);

const areEqual = (last: OptionsListDSLControlState, current: OptionsListDSLControlState) =>
  areComparatorsEqual(
    optionsListStateComparison.comparators,
    last,
    current,
    optionsListStateComparison.defaultState
  );

describe('optionsListStateComparison', () => {
  it.each([
    ['search_technique', { search_technique: DEFAULT_DSL_OPTIONS_LIST_STATE.search_technique }],
    ['sort', { sort: { ...DEFAULT_DSL_OPTIONS_LIST_STATE.sort } }],
    ['exclude', { exclude: false }],
    ['exists_selected', { exists_selected: false }],
  ])('treats a missing %s as its default value', (_, explicitDefault) => {
    expect(areEqual(buildState(), buildState(explicitDefault))).toBe(true);
    expect(areEqual(buildState(explicitDefault), buildState())).toBe(true);
  });

  it.each([
    ['search_technique', { search_technique: 'exact' as const }],
    ['sort', { sort: { by: '_key' as const, direction: 'asc' as const } }],
    ['exclude', { exclude: true }],
    ['exists_selected', { exists_selected: true }],
  ])('reports a non-default %s against a missing value', (_, nonDefault) => {
    expect(areEqual(buildState(), buildState(nonDefault))).toBe(false);
  });

  it('treats missing and empty selected_options as equal', () => {
    expect(areEqual(buildState(), buildState({ selected_options: [] }))).toBe(true);
  });

  it('reports changed selected_options', () => {
    expect(
      areEqual(buildState({ selected_options: ['a'] }), buildState({ selected_options: ['b'] }))
    ).toBe(false);
  });
});
