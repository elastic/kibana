/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import type { ExpandedState, RowSelectionState } from '@tanstack/react-table';
import {
  useDataCascadeActions,
  useDataCascadeState,
  type GroupNode,
  type LeafNode,
} from '../../store_provider';
import { useRestorableState, useRestorableRef } from './data_cascade_restorable_state';

/**
 * Bridges the data cascade internal store with the restorable state system.
 *
 * On mount: applies restored expanded/rowSelection state to the cascade store
 * and restores scroll position.
 *
 * On state changes: syncs expanded/rowSelection from the cascade store back
 * to the restorable state provider (which notifies the parent via onInitialStateChange).
 *
 * On unmount: saves the current scroll offset via useRestorableRef.
 *
 * When no RestorableStateProvider is present (i.e., initialState/onInitialStateChange
 * are not passed), all restorable hooks become no-ops and this hook has no effect.
 */
export const useRestorableDataCascadeState = <G extends GroupNode, L extends LeafNode>(
  scrollElementRef: RefObject<HTMLDivElement | null>
) => {
  const actions = useDataCascadeActions<G, L>();
  const { table } = useDataCascadeState<G, L>();

  // Track expanded and rowSelection via useRestorableState (live sync on every change)
  const [restoredExpandedState, setRestoredExpandedState] = useRestorableState(
    'expandedState',
    {} as ExpandedState
  );
  const [restoredRowSelection, setRestoredRowSelection] = useRestorableState(
    'rowSelection',
    {} as RowSelectionState
  );

  // Track scroll offset via useRestorableRef (saves on unmount only)
  const scrollOffsetRef = useRestorableRef('scrollOffset', 0);

  // Track whether we're in the initial mount phase to prevent redundant syncs
  const isInitializingRef = useRef(true);

  // On mount: restore expanded and rowSelection state into the cascade store
  useEffect(() => {
    const hasExpandedState =
      restoredExpandedState &&
      typeof restoredExpandedState === 'object' &&
      Object.keys(restoredExpandedState).length > 0;

    const hasRowSelection = restoredRowSelection && Object.keys(restoredRowSelection).length > 0;

    if (hasExpandedState) {
      actions.setExpandedRows(restoredExpandedState);
    }

    if (hasRowSelection) {
      actions.setSelectedRows(restoredRowSelection);
    }

    // Mark initialization as complete after the first render cycle
    // Using requestAnimationFrame ensures the store has processed the restored state
    // before we start syncing changes back to the restorable state provider
    requestAnimationFrame(() => {
      isInitializingRef.current = false;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Sync expanded state changes from the cascade store back to restorable state
  useEffect(() => {
    if (isInitializingRef.current) return;
    setRestoredExpandedState(table.expanded ?? {});
  }, [table.expanded, setRestoredExpandedState]);

  // Sync rowSelection changes from the cascade store back to restorable state
  useEffect(() => {
    if (isInitializingRef.current) return;
    setRestoredRowSelection(table.rowSelection ?? {});
  }, [table.rowSelection, setRestoredRowSelection]);

  // Track scroll position via a passive scroll event listener
  useEffect(() => {
    const scrollElement = scrollElementRef.current;
    if (!scrollElement) return;

    const handleScroll = () => {
      scrollOffsetRef.current = scrollElement.scrollTop;
    };

    scrollElement.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      scrollElement.removeEventListener('scroll', handleScroll);
    };
  }, [scrollElementRef, scrollOffsetRef]);

  // Restore scroll position after mount
  useLayoutEffect(() => {
    const scrollElement = scrollElementRef.current;
    if (!scrollElement || !scrollOffsetRef.current) return;

    scrollElement.scrollTop = scrollOffsetRef.current;
  }, [scrollElementRef, scrollOffsetRef]);
};
