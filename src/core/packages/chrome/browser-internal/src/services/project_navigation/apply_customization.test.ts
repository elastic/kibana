/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CloudLinks, ChromeNavLink, NavigationCustomization } from '@kbn/core-chrome-browser';
import { applyCustomization } from './apply_customization';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SOLUTION_ID = 'es' as const;
const EMPTY_DEEP_LINKS: Record<string, ChromeNavLink> = {};
const EMPTY_CLOUD_LINKS: CloudLinks = {};

/** Build a minimal NavigationTreeDefinition from an ordered list of IDs. */
const buildDef = (ids: string[]) => ({
  id: SOLUTION_ID,
  body: ids.map((id) => ({ id, title: id.toUpperCase() })),
});

/** Extract top-level body IDs from the result in rendered order. */
const bodyIds = (result: ReturnType<typeof applyCustomization>): string[] =>
  result.treeUI.body.map((n) => n.id);

/** Build a minimal NavigationCustomization. */
const customization = (
  moves: NavigationCustomization['moves'],
  hidden: NavigationCustomization['hidden'] = []
): NavigationCustomization => ({ moves, hidden });

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('applyCustomization', () => {
  describe('no customization', () => {
    it('returns the tree in original order', () => {
      const result = applyCustomization(
        SOLUTION_ID,
        buildDef(['a', 'b', 'c']),
        EMPTY_DEEP_LINKS,
        EMPTY_CLOUD_LINKS,
        undefined
      );

      expect(bodyIds(result)).toEqual(['a', 'b', 'c']);
    });

    it('sets overflowItemIds to an empty array', () => {
      const result = applyCustomization(
        SOLUTION_ID,
        buildDef(['a', 'b']),
        EMPTY_DEEP_LINKS,
        EMPTY_CLOUD_LINKS,
        undefined
      );

      expect(result.overflowItemIds).toEqual([]);
    });

    it('sets defaultItemIds to all body ids in original order', () => {
      const result = applyCustomization(
        SOLUTION_ID,
        buildDef(['a', 'b', 'c']),
        EMPTY_DEEP_LINKS,
        EMPTY_CLOUD_LINKS,
        undefined
      );

      expect(result.defaultItemIds).toEqual(['a', 'b', 'c']);
    });
  });

  describe('defaultItemIds', () => {
    it('excludes items with renderAs === "home"', () => {
      const def = {
        id: SOLUTION_ID,
        body: [
          { id: 'home_node', title: 'HOME', renderAs: 'home' as const },
          { id: 'a', title: 'A' },
          { id: 'b', title: 'B' },
        ],
      };

      const result = applyCustomization(
        SOLUTION_ID,
        def,
        EMPTY_DEEP_LINKS,
        EMPTY_CLOUD_LINKS,
        undefined
      );

      expect(result.defaultItemIds).toEqual(['a', 'b']);
    });

    it('captures ids from items that use the `link` field instead of `id`', () => {
      const def = {
        id: SOLUTION_ID,
        body: [
          { link: 'discover' as any, title: 'Discover' },
          { id: 'b', title: 'B' },
        ],
      };

      const result = applyCustomization(
        SOLUTION_ID,
        def,
        EMPTY_DEEP_LINKS,
        EMPTY_CLOUD_LINKS,
        undefined
      );

      expect(result.defaultItemIds).toEqual(['discover', 'b']);
    });

    it('reflects the original order even when moves are applied', () => {
      const result = applyCustomization(
        SOLUTION_ID,
        buildDef(['a', 'b', 'c']),
        EMPTY_DEEP_LINKS,
        EMPTY_CLOUD_LINKS,
        customization([{ id: 'c', afterId: null }]) // move c to front
      );

      // defaultItemIds should still be the pre-move order
      expect(result.defaultItemIds).toEqual(['a', 'b', 'c']);
      // but the rendered body should be reordered
      expect(bodyIds(result)).toEqual(['c', 'a', 'b']);
    });
  });

  describe('hidden items (overflowItemIds)', () => {
    it('sets overflowItemIds from customization.hidden', () => {
      const result = applyCustomization(
        SOLUTION_ID,
        buildDef(['a', 'b', 'c']),
        EMPTY_DEEP_LINKS,
        EMPTY_CLOUD_LINKS,
        customization([], ['b' as any, 'c' as any])
      );

      expect(result.overflowItemIds).toEqual(['b', 'c']);
    });

    it('does not alter the body order when only hidden is set', () => {
      const result = applyCustomization(
        SOLUTION_ID,
        buildDef(['a', 'b', 'c']),
        EMPTY_DEEP_LINKS,
        EMPTY_CLOUD_LINKS,
        customization([], ['a' as any])
      );

      expect(bodyIds(result)).toEqual(['a', 'b', 'c']);
    });
  });

  describe('moves', () => {
    it('moves an item to the front when afterId is null', () => {
      const result = applyCustomization(
        SOLUTION_ID,
        buildDef(['a', 'b', 'c']),
        EMPTY_DEEP_LINKS,
        EMPTY_CLOUD_LINKS,
        customization([{ id: 'c', afterId: null }])
      );

      expect(bodyIds(result)).toEqual(['c', 'a', 'b']);
    });

    it('moves an item to directly after a specified sibling', () => {
      const result = applyCustomization(
        SOLUTION_ID,
        buildDef(['a', 'b', 'c', 'd']),
        EMPTY_DEEP_LINKS,
        EMPTY_CLOUD_LINKS,
        customization([{ id: 'd', afterId: 'a' }])
      );

      expect(bodyIds(result)).toEqual(['a', 'd', 'b', 'c']);
    });

    it('applies multiple moves sequentially (each move sees the result of the previous)', () => {
      // Start: [a, b, c, d]
      // Move 1: move d after a  → [a, d, b, c]
      // Move 2: move b to front → [b, a, d, c]
      const result = applyCustomization(
        SOLUTION_ID,
        buildDef(['a', 'b', 'c', 'd']),
        EMPTY_DEEP_LINKS,
        EMPTY_CLOUD_LINKS,
        customization([
          { id: 'd', afterId: 'a' },
          { id: 'b', afterId: null },
        ])
      );

      expect(bodyIds(result)).toEqual(['b', 'a', 'd', 'c']);
    });

    it('skips a move whose id no longer exists in the navigation', () => {
      const result = applyCustomization(
        SOLUTION_ID,
        buildDef(['a', 'b', 'c']),
        EMPTY_DEEP_LINKS,
        EMPTY_CLOUD_LINKS,
        customization([{ id: 'removed_item', afterId: 'a' }])
      );

      // Original order preserved
      expect(bodyIds(result)).toEqual(['a', 'b', 'c']);
    });

    it('skips a move whose afterId no longer exists in the navigation', () => {
      const result = applyCustomization(
        SOLUTION_ID,
        buildDef(['a', 'b', 'c']),
        EMPTY_DEEP_LINKS,
        EMPTY_CLOUD_LINKS,
        customization([{ id: 'a', afterId: 'removed_anchor' }])
      );

      // Original order preserved
      expect(bodyIds(result)).toEqual(['a', 'b', 'c']);
    });

    it('does not skip a move when afterId is null (move to front is always valid)', () => {
      const result = applyCustomization(
        SOLUTION_ID,
        buildDef(['a', 'b', 'c']),
        EMPTY_DEEP_LINKS,
        EMPTY_CLOUD_LINKS,
        customization([{ id: 'c', afterId: null }])
      );

      expect(bodyIds(result)[0]).toBe('c');
    });

    it('moves an item that is currently at the front to a new position', () => {
      const result = applyCustomization(
        SOLUTION_ID,
        buildDef(['a', 'b', 'c']),
        EMPTY_DEEP_LINKS,
        EMPTY_CLOUD_LINKS,
        customization([{ id: 'a', afterId: 'b' }])
      );

      expect(bodyIds(result)).toEqual(['b', 'a', 'c']);
    });

    it('moves an item to the end when afterId is the last item', () => {
      const result = applyCustomization(
        SOLUTION_ID,
        buildDef(['a', 'b', 'c', 'd']),
        EMPTY_DEEP_LINKS,
        EMPTY_CLOUD_LINKS,
        customization([{ id: 'a', afterId: 'd' }])
      );

      expect(bodyIds(result)).toEqual(['b', 'c', 'd', 'a']);
    });
  });

  describe('result shape', () => {
    it('sets the solutionId on the result', () => {
      const result = applyCustomization(
        SOLUTION_ID,
        buildDef(['a']),
        EMPTY_DEEP_LINKS,
        EMPTY_CLOUD_LINKS,
        undefined
      );

      expect(result.id).toBe(SOLUTION_ID);
    });

    it('populates the flattened map with one entry per top-level node', () => {
      const result = applyCustomization(
        SOLUTION_ID,
        buildDef(['a', 'b', 'c']),
        EMPTY_DEEP_LINKS,
        EMPTY_CLOUD_LINKS,
        undefined
      );

      // flattenNav keys by index-based path ('[0]', '[1]', …), not by id.
      // Verify that there is one entry per node and each entry has the expected id.
      expect(Object.keys(result.flattened)).toHaveLength(3);
      const ids = Object.values(result.flattened).map((n) => n.id);
      expect(ids).toEqual(expect.arrayContaining(['a', 'b', 'c']));
    });
  });
});
