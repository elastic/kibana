/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * This file contains the components interactive behaviour:
 *  - `useTreeExpansion` owns the expand/collapse and "show N more" state (and mirrors it to the
 *    host so it survives remounts, triggered by virtualization and in-table search).
 *  - `useRovingTreeNavigation` owns the roving-tabindex keyboard model: which row is focusable,
 *    and how Arrow/Home/End/Enter move focus and drive expansion.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, MutableRefObject } from 'react';
import {
  CHILDREN_INCREMENT,
  INITIAL_CHILDREN,
  isFocusable,
  rowKey,
  type NodeRow,
  type PagerRow,
  type RenderRow,
} from './tree_model';

export interface TreeExpansionState {
  // User clicked a caret to expand the node and see its children.
  expanded: ReadonlySet<string>;
  // User clicked show more to see more hidden siblings.
  revealed: ReadonlyMap<string, number>;
  // The `defaultExpandedLevels` this state was seeded at. A virtualization remount at the same level
  // restores the user's own expansions; a changed setting re-seeds instead of restoring.
  seedLevel?: number;
}

interface UseTreeExpansionArgs {
  initialState?: TreeExpansionState;
  onStateChange?: (state: TreeExpansionState) => void;
  expandedBySearchNodes: ReadonlySet<string>;
  expandableIds: string[];
  // Collections to open when seeding a fresh cell (every collection up to `defaultExpandedLevels`).
  seedExpandedIds: string[];
  // How many nested levels to open by default; also tags the mirrored state so a change re-seeds.
  defaultExpandedLevels: number;
}

export interface TreeExpansion {
  // The user's expansion unioned with the search-driven set (we expand nodes that contains matches) — what the flattener should honour.
  effectiveExpanded: ReadonlySet<string>;
  revealed: ReadonlyMap<string, number>;
  hasControls: boolean;
  isAllExpanded: boolean;
  toggle: (id: string) => void;
  setExpandedFor: (id: string, shouldExpand: boolean) => void;
  expandIds: (ids: string[]) => void;
  revealMore: (id: string) => void;
  showFewer: (id: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
}

export const useTreeExpansion = ({
  initialState,
  onStateChange,
  expandedBySearchNodes,
  expandableIds,
  seedExpandedIds,
  defaultExpandedLevels,
}: UseTreeExpansionArgs): TreeExpansion => {
  // Restore the stored state only when it was seeded at the current level (a virtualization remount);
  // otherwise seed a fresh tree opened to `defaultExpandedLevels`.
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() =>
    initialState && initialState.seedLevel === defaultExpandedLevels
      ? initialState.expanded
      : new Set(seedExpandedIds)
  );
  const [revealed, setRevealed] = useState<ReadonlyMap<string, number>>(() =>
    initialState && initialState.seedLevel === defaultExpandedLevels
      ? initialState.revealed
      : new Map()
  );

  // Mirror expand/reveal state to the host on every change so it can restore the tree after a remount,
  // tagged with the level it was seeded at (read via a ref so the tag never drives the effect itself).
  const onStateChangeRef = useRef(onStateChange);
  onStateChangeRef.current = onStateChange;
  const seedLevelRef = useRef(defaultExpandedLevels);
  seedLevelRef.current = defaultExpandedLevels;
  useEffect(() => {
    onStateChangeRef.current?.({ expanded, revealed, seedLevel: seedLevelRef.current });
  }, [expanded, revealed]);

  // Snap every cell to the new depth when the setting changes: re-seed expansion (discarding manual
  // expand/collapse). The ref guards the initial mount and re-renders where the level is unchanged
  // (e.g. toggling "Hide nulls" rebuilds the tree but must not wipe the user's expansions).
  const appliedLevelRef = useRef(defaultExpandedLevels);
  useEffect(() => {
    if (appliedLevelRef.current === defaultExpandedLevels) return;
    appliedLevelRef.current = defaultExpandedLevels;
    setExpanded(new Set(seedExpandedIds));
    setRevealed(new Map());
  }, [defaultExpandedLevels, seedExpandedIds]);

  // The user's own expansion unioned with the search-driven set. The search set is never persisted
  // (the write-through effect above only mirrors `expanded`/`revealed`), so a query never pollutes
  // the user's expand/collapse state.
  const effectiveExpanded = useMemo(
    () =>
      expandedBySearchNodes.size ? new Set([...expanded, ...expandedBySearchNodes]) : expanded,
    [expanded, expandedBySearchNodes]
  );

  const setExpandedFor = useCallback((id: string, shouldExpand: boolean) => {
    setExpanded((prev) => {
      if (prev.has(id) === shouldExpand) return prev;
      const next = new Set(prev);
      if (shouldExpand) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const toggle = useCallback(
    (id: string) => setExpandedFor(id, !effectiveExpanded.has(id)),
    [effectiveExpanded, setExpandedFor]
  );

  const expandIds = useCallback((ids: string[]) => {
    setExpanded((prev) => {
      let next: Set<string> | undefined;
      for (const id of ids) {
        if (!prev.has(id)) {
          next = next ?? new Set(prev);
          next.add(id);
        }
      }
      return next ?? prev;
    });
  }, []);

  const revealMore = useCallback((id: string) => {
    setRevealed((prev) => {
      const next = new Map(prev);
      next.set(id, (prev.get(id) ?? INITIAL_CHILDREN) + CHILDREN_INCREMENT);
      return next;
    });
  }, []);

  const showFewer = useCallback((id: string) => {
    setRevealed((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => setExpanded(new Set(expandableIds)), [expandableIds]);
  const collapseAll = useCallback(() => setExpanded(new Set()), []);

  const hasControls = expandableIds.length > 0;
  const isAllExpanded = hasControls && expandableIds.every((id) => expanded.has(id));

  return {
    effectiveExpanded,
    revealed,
    hasControls,
    isAllExpanded,
    toggle,
    setExpandedFor,
    expandIds,
    revealMore,
    showFewer,
    expandAll,
    collapseAll,
  };
};

// The slice of `TreeExpansion` the keyboard model drives (so the whole expansion object can be
// passed straight in).
interface RovingNavActions {
  toggle: (id: string) => void;
  setExpandedFor: (id: string, shouldExpand: boolean) => void;
}

export interface RovingNav {
  activeRowId: string | null;
  setActive: (id: string) => void;
  registerRow: (id: string) => (element: HTMLDivElement | null) => void;
  onRowKeyDown: (event: KeyboardEvent<HTMLDivElement>, row: NodeRow | PagerRow) => void;
  onControlKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  // The first header control (Expand/Collapse-all when present, otherwise Copy all): the target
  // when ArrowUp steps up out of the first row.
  firstControlRef: MutableRefObject<HTMLButtonElement | null>;
}

export const useRovingTreeNavigation = (
  rows: RenderRow[],
  { toggle, setExpandedFor }: RovingNavActions
): RovingNav => {
  const orderedIds = useMemo(() => rows.filter(isFocusable).map(rowKey), [rows]);
  const orderedIdSet = useMemo(() => new Set(orderedIds), [orderedIds]);

  const [activeId, setActiveId] = useState<string | null>(null);
  // Exactly one row is part of the tab order (roving tabindex).
  const activeRowId = activeId && orderedIdSet.has(activeId) ? activeId : orderedIds[0] ?? null;

  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  const refCallbacks = useRef(new Map<string, (element: HTMLDivElement | null) => void>());
  const firstControlRef = useRef<HTMLButtonElement | null>(null);

  // A stable ref callback per row id, so React doesn't detach/attach the node every render.
  const registerRow = useCallback((id: string) => {
    const cache = refCallbacks.current;
    let callback = cache.get(id);
    if (!callback) {
      callback = (element: HTMLDivElement | null) => {
        if (element) rowRefs.current.set(id, element);
        else rowRefs.current.delete(id);
      };
      cache.set(id, callback);
    }
    return callback;
  }, []);

  const focusRow = useCallback((id: string | undefined) => {
    if (!id) return;
    setActiveId(id);
    rowRefs.current.get(id)?.focus();
  }, []);

  const onRowKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>, row: NodeRow | PagerRow) => {
      const index = orderedIds.indexOf(rowKey(row));
      const claim = () => {
        event.preventDefault();
        event.stopPropagation();
      };
      switch (event.key) {
        case 'ArrowDown':
          claim();
          focusRow(orderedIds[index + 1]);
          break;
        case 'ArrowUp':
          claim();
          // From the first row, step up to the first header control above the tree.
          if (index === 0) firstControlRef.current?.focus();
          else focusRow(orderedIds[index - 1]);
          break;
        case 'Home':
          claim();
          focusRow(orderedIds[0]);
          break;
        case 'End':
          claim();
          focusRow(orderedIds[orderedIds.length - 1]);
          break;
        case 'ArrowRight':
          claim();
          if (row.kind === 'pager') {
            // Step focus into the pager's first button rather than firing the action; the buttons
            // then own Left/Right navigation between themselves.
            rowRefs.current.get(rowKey(row))?.querySelector<HTMLElement>('button')?.focus();
          } else if (row.hasChildren && !row.isExpanded) {
            setExpandedFor(row.node.id, true);
          } else if (row.hasChildren && row.isExpanded) {
            focusRow(orderedIds[index + 1]);
          } else {
            // Leaf row: step into its first trailing action (copy, then any host-defined actions).
            rowRefs.current
              .get(rowKey(row))
              ?.querySelector<HTMLElement>('.jsonTreeViewerRowAction')
              ?.focus();
          }
          break;
        case 'ArrowLeft':
          claim();
          if (row.kind === 'node' && row.hasChildren && row.isExpanded) {
            setExpandedFor(row.node.id, false);
          } else if (row.parentId) {
            focusRow(row.parentId);
          }
          break;
        case 'Enter':
        case ' ':
          if (row.kind === 'pager') {
            claim();
            rowRefs.current.get(rowKey(row))?.querySelector<HTMLElement>('button')?.click();
          } else if (row.kind === 'node' && row.hasChildren) {
            claim();
            toggle(row.node.id);
          }
          break;
        default:
          break;
      }
    },
    [orderedIds, focusRow, setExpandedFor, toggle]
  );

  // The header controls join the tree's keyboard navigation: Left/Right move between them, ArrowDown
  // steps into the first row, Escape returns to the grid cell, and their keys never leak to the
  // grid's cell nav.
  const onControlKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault();
        event.stopPropagation();
        const header = event.currentTarget.closest<HTMLElement>('.jsonTreeViewerHeader');
        const controls = header
          ? Array.from(header.querySelectorAll<HTMLElement>('.jsonTreeViewerHeaderControl'))
          : [];
        const index = controls.indexOf(event.currentTarget);
        const next = event.key === 'ArrowRight' ? controls[index + 1] : controls[index - 1];
        next?.focus();
      } else if (event.key.startsWith('Arrow')) {
        event.preventDefault();
        event.stopPropagation();
        if (event.key === 'ArrowDown') focusRow(orderedIds[0]);
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.stopPropagation();
      }
    },
    [orderedIds, focusRow]
  );

  return {
    activeRowId,
    setActive: setActiveId,
    registerRow,
    onRowKeyDown,
    onControlKeyDown,
    firstControlRef,
  };
};
