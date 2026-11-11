/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EsqlControlType } from '@kbn/esql-types';
import { areComparatorsEqual } from '@kbn/presentation-publishing';
import {
  esqlControlStateComparison,
  type ESQLControlComparedState,
} from './esql_control_state_comparison';

const buildState = (state: Partial<ESQLControlComparedState>) =>
  ({
    variable_name: 'host',
    variable_type: 'values',
    single_select: true,
    selected_options: ['a'],
    ...state,
  } as ESQLControlComparedState);

const staticState = (state: Partial<ESQLControlComparedState> = {}) =>
  buildState({
    control_type: EsqlControlType.STATIC_VALUES,
    available_options: ['a', 'b'],
    ...state,
  });

const queryState = (state: Partial<ESQLControlComparedState> = {}) =>
  buildState({
    control_type: EsqlControlType.VALUES_FROM_QUERY,
    esql_query: 'FROM logs | STATS BY host',
    ...state,
  });

const areEqual = (last: ESQLControlComparedState, current: ESQLControlComparedState) =>
  areComparatorsEqual(esqlControlStateComparison.comparators, last, current);

describe('esqlControlStateComparison', () => {
  it('ignores a differing esql_query between static controls', () => {
    expect(
      areEqual(staticState({ esql_query: 'FROM a' }), staticState({ esql_query: 'FROM b' }))
    ).toBe(true);
  });

  it('reports a changed esql_query between query-based controls', () => {
    expect(areEqual(queryState(), queryState({ esql_query: 'FROM logs | STATS BY user' }))).toBe(
      false
    );
  });

  it('treats query-based controls with the same esql_query as equal', () => {
    expect(areEqual(queryState(), queryState())).toBe(true);
  });

  it.each([
    ['static to query-based', staticState(), queryState()],
    ['query-based to static', queryState(), staticState()],
  ])('reports switching from %s', (_, last, current) => {
    expect(areEqual(last, current)).toBe(false);
  });

  it('compares esql_query when only one state is query-based', () => {
    const { comparators } = esqlControlStateComparison;
    const compareQuery = comparators.esql_query;
    const last = staticState({ esql_query: 'FROM a' });
    const current = queryState({ esql_query: 'FROM b' });
    expect(typeof compareQuery).toBe('function');
    if (typeof compareQuery !== 'function') return;
    expect(compareQuery(last.esql_query, current.esql_query, last, current)).toBe(false);
    expect(compareQuery(current.esql_query, last.esql_query, current, last)).toBe(false);
  });

  it('reports changed available_options of a static control', () => {
    expect(areEqual(staticState(), staticState({ available_options: ['a', 'c'] }))).toBe(false);
  });
});
