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

/**
 * Build a minimal NavigationTreeDefinition from an ordered list of IDs.
 * Each item is given an absolute `href` so it counts as a "visible leaf" and is
 * therefore retained by `getRenderableNodes` (a leaf with no href is pruned).
 */
const buildDef = (ids: string[]) => ({
  id: SOLUTION_ID,
  body: ids.map((id) => ({ id, title: id.toUpperCase(), href: `https://localhost/app/${id}` })),
});

/** Extract top-level body IDs from the parsed UI tree (includes hidden/home/no-leaf nodes). */
const bodyIds = (result: ReturnType<typeof applyCustomization>): string[] =>
  result.treeUI.body.map((n) => n.id);

/** Extract the render-ready IDs (home, definition-hidden, and no-leaf nodes pruned). */
const renderableIds = (result: ReturnType<typeof applyCustomization>): string[] =>
  result.renderableNodes.map((n) => n.id);

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

      expect(renderableIds(result)).toEqual(['a', 'b', 'c']);
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
      // but the rendered order should be reordered
      expect(renderableIds(result)).toEqual(['c', 'a', 'b']);
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

    it('does not alter the rendered order when only hidden is set', () => {
      const result = applyCustomization(
        SOLUTION_ID,
        buildDef(['a', 'b', 'c']),
        EMPTY_DEEP_LINKS,
        EMPTY_CLOUD_LINKS,
        customization([], ['a' as any])
      );

      expect(renderableIds(result)).toEqual(['a', 'b', 'c']);
    });

    it('keeps customization-hidden items in renderableNodes (hiding is signalled via overflowItemIds, not pruning)', () => {
      // `hidden` only populates overflowItemIds; the consumer moves those items to
      // the "More" menu. The node itself must still be present in the render-ready list.
      const result = applyCustomization(
        SOLUTION_ID,
        buildDef(['a', 'b', 'c']),
        EMPTY_DEEP_LINKS,
        EMPTY_CLOUD_LINKS,
        customization([], ['b' as any])
      );

      expect(renderableIds(result)).toEqual(['a', 'b', 'c']);
      expect(result.overflowItemIds).toEqual(['b']);
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

      expect(renderableIds(result)).toEqual(['c', 'a', 'b']);
    });

    it('moves an item to directly after a specified sibling', () => {
      const result = applyCustomization(
        SOLUTION_ID,
        buildDef(['a', 'b', 'c', 'd']),
        EMPTY_DEEP_LINKS,
        EMPTY_CLOUD_LINKS,
        customization([{ id: 'd', afterId: 'a' }])
      );

      expect(renderableIds(result)).toEqual(['a', 'd', 'b', 'c']);
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

      expect(renderableIds(result)).toEqual(['b', 'a', 'd', 'c']);
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
      expect(renderableIds(result)).toEqual(['a', 'b', 'c']);
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
      expect(renderableIds(result)).toEqual(['a', 'b', 'c']);
    });

    it('does not skip a move when afterId is null (move to front is always valid)', () => {
      const result = applyCustomization(
        SOLUTION_ID,
        buildDef(['a', 'b', 'c']),
        EMPTY_DEEP_LINKS,
        EMPTY_CLOUD_LINKS,
        customization([{ id: 'c', afterId: null }])
      );

      expect(renderableIds(result)[0]).toBe('c');
    });

    it('moves an item that is currently at the front to a new position', () => {
      const result = applyCustomization(
        SOLUTION_ID,
        buildDef(['a', 'b', 'c']),
        EMPTY_DEEP_LINKS,
        EMPTY_CLOUD_LINKS,
        customization([{ id: 'a', afterId: 'b' }])
      );

      expect(renderableIds(result)).toEqual(['b', 'a', 'c']);
    });

    it('moves an item to the end when afterId is the last item', () => {
      const result = applyCustomization(
        SOLUTION_ID,
        buildDef(['a', 'b', 'c', 'd']),
        EMPTY_DEEP_LINKS,
        EMPTY_CLOUD_LINKS,
        customization([{ id: 'a', afterId: 'd' }])
      );

      expect(renderableIds(result)).toEqual(['b', 'c', 'd', 'a']);
    });

    it('moves an item whose id is defined via the `link` field', () => {
      // A `link`-based node is only rendered when a matching deepLink is resolved,
      // otherwise it is removed during parsing (`sideNavStatus: 'remove'`).
      const deepLinks: Record<string, ChromeNavLink> = {
        discover: {
          id: 'discover',
          title: 'Discover',
          baseUrl: '',
          url: '/app/discover',
          href: 'https://localhost/app/discover',
          visibleIn: ['globalSearch'],
        },
      };
      const def = {
        id: SOLUTION_ID,
        body: [
          { link: 'discover' as any, title: 'Discover' },
          { id: 'b', title: 'B', href: 'https://localhost/app/b' },
          { id: 'c', title: 'C', href: 'https://localhost/app/c' },
        ],
      };

      const result = applyCustomization(
        SOLUTION_ID,
        def,
        deepLinks,
        EMPTY_CLOUD_LINKS,
        customization([{ id: 'discover', afterId: 'c' }])
      );

      expect(renderableIds(result)).toEqual(['b', 'c', 'discover']);
    });

    it('records no change for a no-op move (afterId equals current predecessor)', () => {
      const result = applyCustomization(
        SOLUTION_ID,
        buildDef(['a', 'b', 'c']),
        EMPTY_DEEP_LINKS,
        EMPTY_CLOUD_LINKS,
        customization([{ id: 'b', afterId: 'a' }])
      );

      expect(renderableIds(result)).toEqual(['a', 'b', 'c']);
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

  describe('renderableNodes (pruning rules)', () => {
    it('excludes the home node from renderableNodes', () => {
      const def = {
        id: SOLUTION_ID,
        body: [
          { id: 'home_node', title: 'HOME', renderAs: 'home' as const },
          { id: 'a', title: 'A', href: 'https://localhost/app/a' },
          { id: 'b', title: 'B', href: 'https://localhost/app/b' },
        ],
      };

      const result = applyCustomization(
        SOLUTION_ID,
        def,
        EMPTY_DEEP_LINKS,
        EMPTY_CLOUD_LINKS,
        undefined
      );

      expect(renderableIds(result)).toEqual(['a', 'b']);
    });

    it('excludes nodes flagged with sideNavStatus "hidden" in the definition', () => {
      const def = {
        id: SOLUTION_ID,
        body: [
          { id: 'a', title: 'A', href: 'https://localhost/app/a' },
          {
            id: 'b',
            title: 'B',
            href: 'https://localhost/app/b',
            sideNavStatus: 'hidden' as const,
          },
          { id: 'c', title: 'C', href: 'https://localhost/app/c' },
        ],
      };

      const result = applyCustomization(
        SOLUTION_ID,
        def,
        EMPTY_DEEP_LINKS,
        EMPTY_CLOUD_LINKS,
        undefined
      );

      expect(renderableIds(result)).toEqual(['a', 'c']);
    });

    it('excludes a group/panel-opener that has no visible leaf', () => {
      const def = {
        id: SOLUTION_ID,
        body: [
          { id: 'a', title: 'A', href: 'https://localhost/app/a' },
          // group with no href and no children → no visible leaf → pruned
          { id: 'empty_group', title: 'Empty group' },
        ],
      };

      const result = applyCustomization(
        SOLUTION_ID,
        def,
        EMPTY_DEEP_LINKS,
        EMPTY_CLOUD_LINKS,
        undefined
      );

      expect(renderableIds(result)).toEqual(['a']);
    });

    it('retains a group that has at least one visible leaf among its children', () => {
      const def = {
        id: SOLUTION_ID,
        body: [
          { id: 'a', title: 'A', href: 'https://localhost/app/a' },
          {
            id: 'group',
            title: 'Group',
            children: [{ id: 'leaf', title: 'Leaf', href: 'https://localhost/app/leaf' }],
          },
        ],
      };

      const result = applyCustomization(
        SOLUTION_ID,
        def,
        EMPTY_DEEP_LINKS,
        EMPTY_CLOUD_LINKS,
        undefined
      );

      expect(renderableIds(result)).toEqual(['a', 'group']);
    });

    it('reflects the customized order in renderableNodes', () => {
      const result = applyCustomization(
        SOLUTION_ID,
        buildDef(['a', 'b', 'c', 'd']),
        EMPTY_DEEP_LINKS,
        EMPTY_CLOUD_LINKS,
        customization([{ id: 'd', afterId: 'a' }])
      );

      expect(renderableIds(result)).toEqual(['a', 'd', 'b', 'c']);
    });
  });

  describe('version skew (old customization, newer tree)', () => {
    it('replays a still-valid move and ignores parts that reference removed items', () => {
      // v1 default: [discover, dashboards, ml, maps]. The user moved `maps` after
      // `discover`, hid `ml`, and (in v1) also moved `ml` after `dashboards`.
      const oldCustomization = customization(
        [
          { id: 'maps', afterId: 'discover' }, // still valid in v2
          { id: 'ml', afterId: 'dashboards' }, // `ml` removed in v2 → skipped
        ],
        ['ml' as any] // hidden id removed in v2 → harmlessly stale
      );

      // v2 default: `ml` removed, `alerts` added.
      const v2 = buildDef(['discover', 'dashboards', 'maps', 'alerts']);

      const result = applyCustomization(
        SOLUTION_ID,
        v2,
        EMPTY_DEEP_LINKS,
        EMPTY_CLOUD_LINKS,
        oldCustomization
      );

      // Valid move applied; the new item keeps its default slot.
      expect(renderableIds(result)).toEqual(['discover', 'maps', 'dashboards', 'alerts']);
      // Stale hidden id passes through, even though no such node exists anymore.
      expect(result.overflowItemIds).toEqual(['ml']);
      // defaultItemIds reflects the current (v2) tree.
      expect(result.defaultItemIds).toEqual(['discover', 'dashboards', 'maps', 'alerts']);
    });

    it('skips a move whose anchor (afterId) was removed in the newer tree', () => {
      const oldCustomization = customization([{ id: 'maps', afterId: 'ml' }]);
      const v2 = buildDef(['discover', 'dashboards', 'maps', 'alerts']);

      const result = applyCustomization(
        SOLUTION_ID,
        v2,
        EMPTY_DEEP_LINKS,
        EMPTY_CLOUD_LINKS,
        oldCustomization
      );

      // Anchor gone → move skipped → v2 default order preserved.
      expect(renderableIds(result)).toEqual(['discover', 'dashboards', 'maps', 'alerts']);
    });

    it('keeps newly added default items when older moves reorder existing ones', () => {
      // v1: [a, b, c]; user moved `c` to front. v2 adds `d` at the end.
      const oldCustomization = customization([{ id: 'c', afterId: null }]);
      const v2 = buildDef(['a', 'b', 'c', 'd']);

      const result = applyCustomization(
        SOLUTION_ID,
        v2,
        EMPTY_DEEP_LINKS,
        EMPTY_CLOUD_LINKS,
        oldCustomization
      );

      expect(renderableIds(result)).toEqual(['c', 'a', 'b', 'd']);
    });
  });

  describe('edge cases', () => {
    it('handles an empty body', () => {
      const result = applyCustomization(
        SOLUTION_ID,
        buildDef([]),
        EMPTY_DEEP_LINKS,
        EMPTY_CLOUD_LINKS,
        customization([{ id: 'a', afterId: null }], ['b' as any])
      );

      expect(renderableIds(result)).toEqual([]);
      expect(result.defaultItemIds).toEqual([]);
      // hidden ids still pass through even with an empty tree.
      expect(result.overflowItemIds).toEqual(['b']);
    });

    it('passes through a hidden id that does not exist in the tree', () => {
      const result = applyCustomization(
        SOLUTION_ID,
        buildDef(['a', 'b']),
        EMPTY_DEEP_LINKS,
        EMPTY_CLOUD_LINKS,
        customization([], ['does_not_exist' as any])
      );

      expect(result.overflowItemIds).toEqual(['does_not_exist']);
      expect(renderableIds(result)).toEqual(['a', 'b']);
    });

    it('leaves footer nodes untouched while reordering the body', () => {
      const def = {
        id: SOLUTION_ID,
        body: [
          { id: 'a', title: 'A', href: 'https://localhost/app/a' },
          { id: 'b', title: 'B', href: 'https://localhost/app/b' },
        ],
        footer: [{ id: 'settings', title: 'Settings', href: 'https://localhost/app/settings' }],
      };

      const result = applyCustomization(
        SOLUTION_ID,
        def,
        EMPTY_DEEP_LINKS,
        EMPTY_CLOUD_LINKS,
        customization([{ id: 'b', afterId: null }])
      );

      // body reordered
      expect(renderableIds(result)).toEqual(['b', 'a']);
      // footer preserved and not part of body/defaultItemIds
      expect(result.treeUI.footer?.map((n) => n.id)).toEqual(['settings']);
      expect(result.defaultItemIds).not.toContain('settings');
    });
  });
});
