/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook } from '@testing-library/react';
import type { DefaultExpansionSeed } from './tree_model';
import type { TreeExpansionState, UseTreeExpansionArgs } from './use_tree_interaction';
import { useTreeExpansion } from './use_tree_interaction';

const seed = (
  expanded: string[] = [],
  revealed: Array<[string, number]> = []
): DefaultExpansionSeed => ({
  expanded: new Set(expanded),
  revealed: new Map(revealed),
});

const makeArgs = (overrides: Partial<UseTreeExpansionArgs> = {}): UseTreeExpansionArgs => ({
  expandedBySearchNodes: new Set(),
  expandableIds: ['a', 'b', 'c'],
  expansionSeed: seed(),
  defaultRenderedNodes: 50,
  ...overrides,
});

const renderExpansion = (args: UseTreeExpansionArgs) =>
  renderHook((props: UseTreeExpansionArgs) => useTreeExpansion(props), { initialProps: args });

describe('useTreeExpansion', () => {
  it('seeds a fresh tree from expansionSeed when there is no persisted state', () => {
    const { result } = renderExpansion(makeArgs({ expansionSeed: seed(['a']) }));

    expect(result.current.effectiveExpanded).toEqual(new Set(['a']));
  });

  it('restores persisted state when its seedBudget matches the current budget', () => {
    const initialState: TreeExpansionState = {
      expanded: new Set(['x']),
      revealed: new Map(),
      seedBudget: 50,
    };

    const { result } = renderExpansion(
      makeArgs({ initialState, defaultRenderedNodes: 50, expansionSeed: seed(['a']) })
    );

    // The persisted expansion wins over the seed because it was stored at the same budget.
    expect(result.current.effectiveExpanded).toEqual(new Set(['x']));
  });

  it('ignores persisted state whose seedBudget differs from the current budget', () => {
    const initialState: TreeExpansionState = {
      expanded: new Set(['x']),
      revealed: new Map(),
      seedBudget: 50,
    };

    const { result } = renderExpansion(
      makeArgs({ initialState, defaultRenderedNodes: 100, expansionSeed: seed(['a']) })
    );

    // Stored at budget 50 but the current budget is 100, so we re-seed instead of restoring.
    expect(result.current.effectiveExpanded).toEqual(new Set(['a']));
  });

  it('re-seeds and drops manual expansions when defaultRenderedNodes changes', () => {
    const { result, rerender } = renderExpansion(makeArgs({ expansionSeed: seed(['a']) }));

    act(() => result.current.toggle('b'));
    expect(result.current.effectiveExpanded).toEqual(new Set(['a', 'b']));

    rerender(
      makeArgs({ defaultRenderedNodes: 100, expansionSeed: seed(['a', 'c'], [['coll', 20]]) })
    );

    // Changing the budget snaps every cell back to the fresh seed, discarding the manual expand.
    expect(result.current.effectiveExpanded).toEqual(new Set(['a', 'c']));
    expect(result.current.revealed).toEqual(new Map([['coll', 20]]));
  });

  it('preserves manual expansions when the tree is rebuilt at the same budget', () => {
    const { result, rerender } = renderExpansion(makeArgs({ expansionSeed: seed(['a']) }));

    act(() => result.current.toggle('b'));
    expect(result.current.effectiveExpanded).toEqual(new Set(['a', 'b']));

    // A rebuild (e.g. toggling "Hide nulls") produces a new seed object at the same budget.
    rerender(makeArgs({ defaultRenderedNodes: 50, expansionSeed: seed(['z']) }));

    expect(result.current.effectiveExpanded).toEqual(new Set(['a', 'b']));
  });

  it('mirrors expansion state to the host tagged with the current seedBudget', () => {
    const emitted: TreeExpansionState[] = [];
    const { result } = renderExpansion(
      makeArgs({ expansionSeed: seed(['a']), onStateChange: (state) => emitted.push(state) })
    );

    expect(emitted.at(-1)).toEqual({
      expanded: new Set(['a']),
      revealed: new Map(),
      seedBudget: 50,
    });

    act(() => result.current.toggle('b'));

    expect(emitted.at(-1)).toEqual({
      expanded: new Set(['a', 'b']),
      revealed: new Map(),
      seedBudget: 50,
    });
  });
});
