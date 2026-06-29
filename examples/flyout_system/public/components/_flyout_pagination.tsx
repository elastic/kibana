/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useRef, useSyncExternalStore } from 'react';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiText, EuiToolTip } from '@elastic/eui';
import type { EuiFlyoutMenuProps } from '@elastic/eui';

// ─── Future EUI interface ──────────────────────────────────────────────────────
// This is the shape we expect EUI to ship as EuiFlyoutMenuProps.pagination.
// When the EUI PR lands: delete this file's shim exports and replace call sites with
//   flyoutMenuProps={{ pagination: { currentIndex, total, onPrevious, onNext } }}

export interface EuiFlyoutMenuPagination {
  currentIndex: number;
  total: number;
  onPrevious: () => void;
  onNext: () => void;
}

// ─── Pagination controls UI ───────────────────────────────────────────────────
// Accepts pagination state directly. Use this in same-React-tree scenarios
// (e.g. EuiFlyout component variant) where plain state flows naturally.

export const FlyoutPaginationControls: React.FC<EuiFlyoutMenuPagination> = ({
  currentIndex,
  total,
  onPrevious,
  onNext,
}) => (
  <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
    <EuiFlexItem grow={false}>
      <EuiToolTip content="Previous document" disableScreenReaderOutput>
        <EuiButtonIcon
          iconType="arrowUp"
          aria-label="Previous document"
          onClick={onPrevious}
          disabled={currentIndex === 0}
        />
      </EuiToolTip>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiText size="s">
        <span data-test-subj="flyoutPaginationCounter">
          {currentIndex + 1} of {total}
        </span>
      </EuiText>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiToolTip content="Next document" disableScreenReaderOutput>
        <EuiButtonIcon
          iconType="arrowDown"
          aria-label="Next document"
          onClick={onNext}
          disabled={currentIndex === total - 1}
        />
      </EuiToolTip>
    </EuiFlexItem>
  </EuiFlexGroup>
);

// ─── Store ────────────────────────────────────────────────────────────────────
// A subscribable store for pagination state. Needed only when the menu bar and
// flyout body render in separate React roots (openSystemFlyout overlays variant).
// React context cannot cross root boundaries, so both sides subscribe to the
// same store instance passed as a plain JS object reference.

export interface FlyoutPaginationStore {
  getSnapshot: () => EuiFlyoutMenuPagination;
  subscribe: (listener: () => void) => () => void;
}

export const createPaginationStore = (total: number): FlyoutPaginationStore => {
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((fn) => fn());

  const onPrevious = () => {
    const { currentIndex } = snapshot;
    if (currentIndex > 0) {
      snapshot = { ...snapshot, currentIndex: currentIndex - 1 };
      notify();
    }
  };

  const onNext = () => {
    const { currentIndex } = snapshot;
    if (currentIndex < total - 1) {
      snapshot = { ...snapshot, currentIndex: currentIndex + 1 };
      notify();
    }
  };

  let snapshot: EuiFlyoutMenuPagination = { currentIndex: 0, total, onPrevious, onNext };

  return {
    getSnapshot: () => snapshot,
    subscribe: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
};

export const usePaginationStore = (store: FlyoutPaginationStore): EuiFlyoutMenuPagination =>
  useSyncExternalStore(store.subscribe, store.getSnapshot);

// ─── Overlays shim ────────────────────────────────────────────────────────────
// Converts a FlyoutPaginationStore to stable EuiFlyoutMenuProps for use with
// openSystemFlyout. The returned object is referentially stable so EUI does not
// re-animate the flyout when pagination state changes. Controls read state
// directly from the store via useSyncExternalStore inside their own render.
//
// To migrate when EUI ships the pagination prop:
//   delete useFlyoutMenuPropsWithPagination → replace usages with:
//   flyoutMenuProps={{ pagination: usePaginationStore(store) }}

export const useFlyoutMenuPropsWithPagination = (
  store: FlyoutPaginationStore
): EuiFlyoutMenuProps => {
  const storeRef = useRef(store);
  storeRef.current = store;

  return useMemo(
    () => ({
      title: <StoreConnectedPaginationControls storeRef={storeRef} />,
      hideTitle: false,
    }),
    [] // intentionally stable — controls subscribe to the store directly
  );
};

const StoreConnectedPaginationControls: React.FC<{
  storeRef: React.RefObject<FlyoutPaginationStore>;
}> = ({ storeRef }) => {
  const pagination = usePaginationStore(storeRef.current!);
  return <FlyoutPaginationControls {...pagination} />;
};
