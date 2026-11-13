/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';

import type {
  DataGridApi,
  DataGridCellAddress,
  DataGridCommandFailureReason,
  DataGridCommandResult,
} from './data_grid_api';
import {
  areDataGridCellAddressesEqual,
  getFirstDataGridCell,
  reconcileDataGridActiveCell,
} from './data_grid_navigation';

interface PendingFocusCommand {
  readonly address: DataGridCellAddress;
  readonly generation: number;
  readonly resolve: (result: DataGridCommandResult) => void;
}

interface UseDataGridFocusOptions {
  readonly rowIds: readonly string[];
  readonly columnIds: readonly string[];
  readonly gridRef: RefObject<HTMLDivElement>;
  readonly scrollToRow: (rowIndex: number) => boolean;
  readonly onCommandFailure: (reason: DataGridCommandFailureReason) => void;
  readonly onRowsBecameEmpty: () => void;
}

interface UseDataGridFocusResult {
  readonly activeCell: DataGridCellAddress | null;
  readonly api: DataGridApi;
  readonly focusCell: DataGridApi['focusCell'];
  readonly registerCell: (address: DataGridCellAddress, element: HTMLDivElement | null) => void;
  readonly activateFocusedCell: (address: DataGridCellAddress) => void;
  readonly releaseFocusOwnership: () => void;
}

const completedResult: DataGridCommandResult = { status: 'completed' };

const getAddressedElement = <TElement extends HTMLElement>(
  elements: Map<string, Map<string, TElement>>,
  address: DataGridCellAddress
): TElement | undefined => elements.get(address.rowId)?.get(address.columnId);

const setAddressedElement = <TElement extends HTMLElement>(
  elements: Map<string, Map<string, TElement>>,
  address: DataGridCellAddress,
  element: TElement | null
): TElement | undefined => {
  const rowElements = elements.get(address.rowId);
  const previousElement = rowElements?.get(address.columnId);

  if (element) {
    const nextRowElements = rowElements ?? new Map<string, TElement>();
    nextRowElements.set(address.columnId, element);
    elements.set(address.rowId, nextRowElements);
  } else if (rowElements) {
    rowElements.delete(address.columnId);
    if (rowElements.size === 0) {
      elements.delete(address.rowId);
    }
  }

  return previousElement;
};

const elementOwnsFocus = (element: HTMLElement | undefined): boolean =>
  Boolean(
    element && (document.activeElement === element || element.contains(document.activeElement))
  );

const scrollElementIntoView = (element: HTMLElement): void => {
  if (typeof element.scrollIntoView === 'function') {
    element.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
};

const areIdListsEqual = (first: readonly string[], second: readonly string[]): boolean =>
  first.length === second.length && first.every((id, index) => id === second[index]);

export const useDataGridFocus = ({
  rowIds,
  columnIds,
  gridRef,
  scrollToRow,
  onCommandFailure,
  onRowsBecameEmpty,
}: UseDataGridFocusOptions): UseDataGridFocusResult => {
  const currentModel = useMemo(() => ({ rowIds, columnIds }), [columnIds, rowIds]);
  const previousModelRef = useRef(currentModel);
  const modelRef = useRef(currentModel);
  modelRef.current = currentModel;

  // Tracks the logical active cell and initializes it to the first available cell.
  const [activeCell, setActiveCell] = useState<DataGridCellAddress | null>(() =>
    getFirstDataGridCell(currentModel)
  );
  const activeCellRef = useRef(activeCell);
  activeCellRef.current = activeCell;

  // Maps logical cell addresses to the DOM elements that are currently mounted.
  const cellElementsRef = useRef(new Map<string, Map<string, HTMLDivElement>>());

  // Tracks a valid focus target whose DOM element has not mounted yet.
  const pendingFocusRef = useRef<PendingFocusCommand | null>(null);

  // Identifies the latest focus request so stale mounts cannot complete older work.
  const focusRequestGenerationRef = useRef(0);

  // Records which request still has permission to move browser focus.
  const focusOwnershipRef = useRef<number | null>(null);

  // Remembers an active cell whose focused DOM element was removed by virtualization.
  const lostOwnedFocusRef = useRef<DataGridCellAddress | null>(null);
  const lostOwnedFocusModelRef = useRef(currentModel);

  // Keeps stable callbacks connected to the latest virtualizer and announcement handlers.
  const scrollToRowRef = useRef(scrollToRow);
  scrollToRowRef.current = scrollToRow;
  const onCommandFailureRef = useRef(onCommandFailure);
  onCommandFailureRef.current = onCommandFailure;
  const onRowsBecameEmptyRef = useRef(onRowsBecameEmpty);
  onRowsBecameEmptyRef.current = onRowsBecameEmpty;

  // Cancels pending focus work and invalidates its permission to move focus.
  const cancelPendingFocus = useCallback((reason: 'superseded' | 'grid_unmounted') => {
    focusRequestGenerationRef.current += 1;
    focusOwnershipRef.current = null;
    const pendingFocus = pendingFocusRef.current;
    if (!pendingFocus) {
      return;
    }

    pendingFocusRef.current = null;
    pendingFocus.resolve({ status: 'cancelled', reason });
  }, []);

  // Fails pending focus work and reports the reason to the consumer.
  const failPendingFocus = useCallback((reason: DataGridCommandFailureReason) => {
    const pendingFocus = pendingFocusRef.current;
    if (!pendingFocus) {
      return;
    }

    pendingFocusRef.current = null;
    focusOwnershipRef.current = null;
    pendingFocus.resolve({ status: 'failed', reason });
    onCommandFailureRef.current(reason);
  }, []);

  // Validates a logical address and resolves its current row index for virtualization.
  const resolveAddress = useCallback(
    (
      address: DataGridCellAddress
    ): { readonly rowIndex: number } | { readonly failure: DataGridCommandFailureReason } => {
      const { rowIds: currentRowIds, columnIds: currentColumnIds } = modelRef.current;
      const rowIndex = currentRowIds.indexOf(address.rowId);
      if (rowIndex < 0) {
        return { failure: 'row_not_found' };
      }
      if (!currentColumnIds.includes(address.columnId)) {
        return { failure: 'column_not_found' };
      }
      return { rowIndex };
    },
    []
  );

  // Commits and focuses a mounted cell after bringing it into view.
  const commitFocusedCell = useCallback(
    (address: DataGridCellAddress, element: HTMLDivElement): void => {
      activeCellRef.current = address;
      setActiveCell(address);
      lostOwnedFocusRef.current = null;
      focusOwnershipRef.current = null;
      scrollElementIntoView(element);
      element.focus({ preventScroll: true });
    },
    []
  );

  // Runs a cancellable focus transaction, waiting for the target cell to mount when needed.
  const focusCell = useCallback<DataGridApi['focusCell']>(
    (address) => {
      cancelPendingFocus('superseded');
      const resolution = resolveAddress(address);
      if ('failure' in resolution) {
        onCommandFailureRef.current(resolution.failure);
        return Promise.resolve({ status: 'failed', reason: resolution.failure });
      }

      const generation = focusRequestGenerationRef.current;
      focusOwnershipRef.current = generation;
      const cellElement = getAddressedElement(cellElementsRef.current, address);
      if (cellElement) {
        if (!scrollToRowRef.current(resolution.rowIndex)) {
          focusOwnershipRef.current = null;
          onCommandFailureRef.current('scroll_failed');
          return Promise.resolve({ status: 'failed', reason: 'scroll_failed' });
        }
        commitFocusedCell(address, cellElement);
        return Promise.resolve(completedResult);
      }

      const result = new Promise<DataGridCommandResult>((resolve) => {
        pendingFocusRef.current = { address, generation, resolve };
      });
      if (!scrollToRowRef.current(resolution.rowIndex)) {
        failPendingFocus('scroll_failed');
      }
      return result;
    },
    [cancelPendingFocus, commitFocusedCell, failPendingFocus, resolveAddress]
  );

  // Scrolls to a logical cell without changing the active cell or DOM focus.
  const scrollToCell = useCallback<DataGridApi['scrollToCell']>(
    (address) => {
      cancelPendingFocus('superseded');
      const resolution = resolveAddress(address);
      if ('failure' in resolution) {
        onCommandFailureRef.current(resolution.failure);
        return Promise.resolve({ status: 'failed', reason: resolution.failure });
      }

      if (!scrollToRowRef.current(resolution.rowIndex)) {
        onCommandFailureRef.current('scroll_failed');
        return Promise.resolve({ status: 'failed', reason: 'scroll_failed' });
      }
      return Promise.resolve(completedResult);
    },
    [cancelPendingFocus, resolveAddress]
  );

  // Tracks mounted cells and completes pending or restorable focus when elements appear.
  const registerCell = useCallback(
    (address: DataGridCellAddress, element: HTMLDivElement | null) => {
      const previousElement = setAddressedElement(cellElementsRef.current, address, element);
      if (!element) {
        if (elementOwnsFocus(previousElement)) {
          lostOwnedFocusRef.current = address;
          lostOwnedFocusModelRef.current = modelRef.current;
        }
        return;
      }

      const pendingFocus = pendingFocusRef.current;
      if (
        pendingFocus &&
        pendingFocus.generation === focusRequestGenerationRef.current &&
        pendingFocus.generation === focusOwnershipRef.current &&
        areDataGridCellAddressesEqual(pendingFocus.address, address)
      ) {
        const resolution = resolveAddress(address);
        if ('failure' in resolution) {
          failPendingFocus(resolution.failure);
          return;
        }
        if (!scrollToRowRef.current(resolution.rowIndex)) {
          failPendingFocus('scroll_failed');
          return;
        }
        pendingFocusRef.current = null;
        commitFocusedCell(address, element);
        pendingFocus.resolve(completedResult);
        return;
      }

      if (
        areDataGridCellAddressesEqual(lostOwnedFocusRef.current, address) &&
        areDataGridCellAddressesEqual(activeCellRef.current, address) &&
        (document.activeElement === document.body || document.activeElement === gridRef.current)
      ) {
        lostOwnedFocusRef.current = null;
        element.focus({ preventScroll: true });
      }
    },
    [commitFocusedCell, failPendingFocus, gridRef, resolveAddress]
  );

  // Makes a directly focused cell active and cancels stale focus work.
  const activateFocusedCell = useCallback(
    (address: DataGridCellAddress) => {
      cancelPendingFocus('superseded');
      activeCellRef.current = address;
      lostOwnedFocusRef.current = null;
      setActiveCell(address);
    },
    [cancelPendingFocus]
  );

  // Cancels pending work when the grid no longer owns browser focus.
  const releaseFocusOwnership = useCallback(() => {
    cancelPendingFocus('superseded');
    lostOwnedFocusRef.current = null;
  }, [cancelPendingFocus]);

  // Reconciles active and pending focus with row or column model changes before paint.
  useLayoutEffect(() => {
    const previousModel = previousModelRef.current;
    const previousActiveCell = activeCellRef.current;
    const reconciledActiveCell = reconcileDataGridActiveCell(
      previousActiveCell,
      previousModel,
      currentModel
    );
    const rowOrderChanged = !areIdListsEqual(previousModel.rowIds, rowIds);
    const columnOrderChanged = !areIdListsEqual(previousModel.columnIds, columnIds);
    const logicalOrderChanged = rowOrderChanged || columnOrderChanged;
    previousModelRef.current = currentModel;

    const pendingFocus = pendingFocusRef.current;
    if (pendingFocus) {
      const resolution = resolveAddress(pendingFocus.address);
      if ('failure' in resolution) {
        failPendingFocus(resolution.failure);
      } else if (rowOrderChanged && !scrollToRowRef.current(resolution.rowIndex)) {
        failPendingFocus('scroll_failed');
      }
    }

    if (lostOwnedFocusModelRef.current !== currentModel) {
      lostOwnedFocusRef.current = null;
    }

    if (areDataGridCellAddressesEqual(previousActiveCell, reconciledActiveCell)) {
      if (
        !pendingFocusRef.current &&
        logicalOrderChanged &&
        lostOwnedFocusRef.current &&
        reconciledActiveCell
      ) {
        lostOwnedFocusRef.current = null;
        void focusCell(reconciledActiveCell);
      }
      return;
    }

    activeCellRef.current = reconciledActiveCell;
    setActiveCell(reconciledActiveCell);

    if (!reconciledActiveCell) {
      if (previousModel.rowIds.length > 0 && rowIds.length === 0) {
        onRowsBecameEmptyRef.current();
      }
      if (lostOwnedFocusRef.current) {
        lostOwnedFocusRef.current = null;
        gridRef.current?.focus({ preventScroll: true });
      }
      return;
    }

    if (
      !pendingFocusRef.current &&
      (lostOwnedFocusRef.current || document.activeElement === gridRef.current)
    ) {
      lostOwnedFocusRef.current = null;
      void focusCell(reconciledActiveCell);
    }
  }, [columnIds, currentModel, failPendingFocus, focusCell, gridRef, resolveAddress, rowIds]);

  // Cancels pending focus work when the grid unmounts.
  useEffect(
    () => () => {
      cancelPendingFocus('grid_unmounted');
    },
    [cancelPendingFocus]
  );

  // Releases focus ownership when focus moves outside the grid.
  useEffect(() => {
    const onDocumentFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (target instanceof Node && gridRef.current?.contains(target)) {
        return;
      }
      releaseFocusOwnership();
    };

    document.addEventListener('focusin', onDocumentFocusIn);
    return () => document.removeEventListener('focusin', onDocumentFocusIn);
  }, [gridRef, releaseFocusOwnership]);

  const api = useMemo<DataGridApi>(() => ({ focusCell, scrollToCell }), [focusCell, scrollToCell]);

  return {
    activeCell,
    api,
    focusCell,
    registerCell,
    activateFocusedCell,
    releaseFocusOwnership,
  };
};
