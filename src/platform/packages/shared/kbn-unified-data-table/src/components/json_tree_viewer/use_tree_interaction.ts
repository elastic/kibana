/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * The JSON tree's interactive behaviour, split from the view:
 *  - `useTreeExpansion` owns the expand/collapse and "show N more" state (and mirrors it to the
 *    host so it survives the remounts in-table search forces on every keystroke).
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

// The tree's expand/collapse and "show N more" state, lifted out so a host can persist it across
// remounts (in-table search remounts every cell via a search-term-keyed React `key`).
export interface TreeExpansionState {
  expanded: ReadonlySet<string>;
  revealed: ReadonlyMap<string, number>;
}

interface UseTreeExpansionArgs {
  initialState?: TreeExpansionState;
  onStateChange?: (state: TreeExpansionState) => void;
  // Collections force-open for the active search term; unioned in but never persisted.
  searchExpanded: ReadonlySet<string>;
  // Every toggleable collection id, for Expand-all and the `isAllExpanded` check.
  expandableIds: string[];
}

export interface TreeExpansion {
  // The user's expansion unioned with the search-driven set — what the flattener should honour.
  effectiveExpanded: ReadonlySet<string>;
  revealed: ReadonlyMap<string, number>;
  hasControls: boolean;
  isAllExpanded: boolean;
  toggle: (id: string) => void;
  setExpandedFor: (id: string, shouldExpand: boolean) => void;
  activatePager: (row: PagerRow) => void;
  revealMore: (id: string) => void;
  showFewer: (id: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
}

export const useTreeExpansion = ({
  initialState,
  onStateChange,
  searchExpanded,
  expandableIds,
}: UseTreeExpansionArgs): TreeExpansion => {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(
    () => initialState?.expanded ?? new Set()
  );
  const [revealed, setRevealed] = useState<ReadonlyMap<string, number>>(
    () => initialState?.revealed ?? new Map()
  );

  // Mirror expand/reveal state to the host on every change so it can restore the tree after a
  // remount. Held in a ref so a changing callback identity never re-fires the effect; local state
  // stays the render source of truth, so expanding still re-renders only this cell.
  const onStateChangeRef = useRef(onStateChange);
  onStateChangeRef.current = onStateChange;
  useEffect(() => {
    onStateChangeRef.current?.({ expanded, revealed });
  }, [expanded, revealed]);

  // The user's own expansion unioned with the search-driven set. The search set is never persisted
  // (the write-through effect above only mirrors `expanded`/`revealed`), so a query never pollutes
  // the user's expand/collapse state.
  const effectiveExpanded = useMemo(
    () => (searchExpanded.size ? new Set([...expanded, ...searchExpanded]) : expanded),
    [expanded, searchExpanded]
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

  // The pager's primary action: reveal the next chunk while items remain, else collapse back.
  const activatePager = useCallback(
    (row: PagerRow) =>
      row.hiddenCount > 0 ? revealMore(row.collectionId) : showFewer(row.collectionId),
    [revealMore, showFewer]
  );

  // Expand-all only flips expansion; it never raises reveal budgets, so the DOM stays
  // bounded by the per-collection caps even for a huge document.
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
    activatePager,
    revealMore,
    showFewer,
    expandAll,
    collapseAll,
  };
};

// The slice of `TreeExpansion` the keyboard model drives (so the whole expansion object can be
// passed straight in).
interface RovingNavActions {
  hasControls: boolean;
  toggle: (id: string) => void;
  setExpandedFor: (id: string, shouldExpand: boolean) => void;
  activatePager: (row: PagerRow) => void;
}

export interface RovingNav {
  activeRowId: string | null;
  setActive: (id: string) => void;
  registerRow: (id: string) => (element: HTMLDivElement | null) => void;
  onRowKeyDown: (event: KeyboardEvent<HTMLDivElement>, row: NodeRow | PagerRow) => void;
  onControlKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  expandAllRef: MutableRefObject<HTMLButtonElement | null>;
}

export const useRovingTreeNavigation = (
  rows: RenderRow[],
  { hasControls, toggle, setExpandedFor, activatePager }: RovingNavActions
): RovingNav => {
  const orderedIds = useMemo(() => rows.filter(isFocusable).map(rowKey), [rows]);
  const orderedIdSet = useMemo(() => new Set(orderedIds), [orderedIds]);

  const [activeId, setActiveId] = useState<string | null>(null);
  // Exactly one row is part of the tab order (roving tabindex).
  const activeRowId = activeId && orderedIdSet.has(activeId) ? activeId : orderedIds[0] ?? null;

  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  const refCallbacks = useRef(new Map<string, (element: HTMLDivElement | null) => void>());
  const expandAllRef = useRef<HTMLButtonElement | null>(null);

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
      // Claim the keys the tree navigates with. `stopPropagation` is the important half: EuiDataGrid
      // moves the focused cell from a bubble-phase keydown on the grid body, so without it Arrow/
      // Home/End would jump between grid cells instead of tree rows. Keys the tree does not handle
      // (Tab, Escape, PageUp/Down) still bubble, so the grid's own navigation keeps working.
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
          // From the first row, step up to the Expand/Collapse-all control above the tree.
          if (index === 0 && hasControls) expandAllRef.current?.focus();
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
            activatePager(row);
          } else if (row.hasChildren && !row.isExpanded) {
            setExpandedFor(row.node.id, true);
          } else if (row.hasChildren && row.isExpanded) {
            focusRow(orderedIds[index + 1]);
          } else {
            // Leaf row: step into its copy-value button, if it has one.
            rowRefs.current
              .get(rowKey(row))
              ?.querySelector<HTMLElement>('.jsonSyntaxTreeCopyButton')
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
            activatePager(row);
          } else if (row.hasChildren) {
            claim();
            toggle(row.node.id);
          }
          break;
        default:
          break;
      }
    },
    [orderedIds, focusRow, setExpandedFor, toggle, activatePager, hasControls]
  );

  // The Expand/Collapse-all control joins the tree's keyboard navigation: ArrowDown steps into the
  // first row, Escape returns to the grid cell, and its keys never leak to the grid's cell nav.
  const onControlKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key.startsWith('Arrow')) {
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
    expandAllRef,
  };
};
