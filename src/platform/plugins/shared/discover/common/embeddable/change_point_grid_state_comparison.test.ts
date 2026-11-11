/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { areComparatorsEqual } from '@kbn/presentation-publishing';
import type { ChangePointGridEmbeddableState } from '../../server/embeddable/change_point_grid_schema';
import { changePointGridStateComparison } from './change_point_grid_state_comparison';

const { comparators, defaultState } = changePointGridStateComparison;

const isEqual = (
  last: Partial<ChangePointGridEmbeddableState>,
  current: Partial<ChangePointGridEmbeddableState>
) =>
  areComparatorsEqual(
    comparators,
    last as ChangePointGridEmbeddableState,
    current as ChangePointGridEmbeddableState,
    defaultState
  );

const esql = 'FROM logs | STATS count = COUNT(*) BY BUCKET(@timestamp, 1 hour)';

describe('changePointGridStateComparison', () => {
  it('detects a changed query', () => {
    expect(isEqual({ esql }, { esql })).toBe(true);
    expect(isEqual({ esql }, { esql: `${esql} | LIMIT 10` })).toBe(false);
  });

  it('applies the dashboard context by default', () => {
    expect(isEqual({ esql }, { esql, apply_dashboard_context: true })).toBe(true);
    expect(isEqual({ esql }, { esql, apply_dashboard_context: false })).toBe(false);
  });

  it('compares the static context deeply', () => {
    const staticContext = { query: { language: 'kql' as const, expression: 'host: a' } };
    const last = { esql, apply_dashboard_context: false, static_context: staticContext };

    expect(isEqual(last, { ...last, static_context: { ...staticContext } })).toBe(true);
    expect(
      isEqual(last, {
        ...last,
        static_context: { query: { language: 'kql', expression: 'host: b' } },
      })
    ).toBe(false);
  });
});
