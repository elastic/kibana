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
  readonly interactionCell: DataGridCellAddress | null;
  readonly api: DataGridApi;
  readonly focusCell: DataGridApi['focusCell'];
  readonly registerCell: (address: DataGridCellAddress, element: HTMLDivElement | null) => void;
  readonly registerInteractionTarget: (
    address: DataGridCellAddress,
    element: HTMLElement | null
  ) => void;
  readonly enterNavigationMode: (address: DataGridCellAddress) => void;
  readonly enterInteractionMode: (address: DataGridCellAddress) => boolean;
  readonly deactivateInteractionMode: (address: DataGridCellAddress) => void;
  readonly leaveInteractionMode: (address: DataGridCellAddress) => void;
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

  const [activeCell, setActiveCell] = useState<DataGridCellAddress | null>(() =>
    getFirstDataGridCell(currentModel)
  );
  const activeCellRef = useRef(activeCell);
  activeCellRef.current = activeCell;
  const [interactionCell, setInteractionCell] = useState<DataGridCellAddress | null>(null);
  const interactionCellRef = useRef(interactionCell);
  interactionCellRef.current = interactionCell;

  const cellElementsRef = useRef(new Map<string, Map<string, HTMLDivElement>>());
  const interactionElementsRef = useRef(new Map<string, Map<string, HTMLElement>>());
  const pendingFocusRef = useRef<PendingFocusCommand | null>(null);
  const pendingInteractionExitRef = useRef<DataGridCellAddress | null>(null);
  const lostOwnedFocusRef = useRef<DataGridCellAddress | null>(null);
  const scrollToRowRef = useRef(scrollToRow);
  scrollToRowRef.current = scrollToRow;
  const onCommandFailureRef = useRef(onCommandFailure);
  onCommandFailureRef.current = onCommandFailure;
  const onRowsBecameEmptyRef = useRef(onRowsBecameEmpty);
  onRowsBecameEmptyRef.current = onRowsBecameEmpty;

  const cancelPendingFocus = useCallback((reason: 'superseded' | 'grid_unmounted') => {
    const pendingFocus = pendingFocusRef.current;
    if (!pendingFocus) {
      return;
    }

    pendingFocusRef.current = null;
    pendingFocus.resolve({ status: 'cancelled', reason });
  }, []);

  const failPendingFocus = useCallback((reason: DataGridCommandFailureReason) => {
    const pendingFocus = pendingFocusRef.current;
    if (!pendingFocus) {
      return;
    }

    pendingFocusRef.current = null;
    pendingFocus.resolve({ status: 'failed', reason });
    onCommandFailureRef.current(reason);
  }, []);

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

  const focusCell = useCallback<DataGridApi['focusCell']>(
    (address) => {
      const resolution = resolveAddress(address);
      if ('failure' in resolution) {
        onCommandFailureRef.current(resolution.failure);
        return Promise.resolve({ status: 'failed', reason: resolution.failure });
      }

      if (!scrollToRowRef.current(resolution.rowIndex)) {
        onCommandFailureRef.current('scroll_failed');
        return Promise.resolve({ status: 'failed', reason: 'scroll_failed' });
      }

      cancelPendingFocus('superseded');
      pendingInteractionExitRef.current = null;
      activeCellRef.current = address;
      interactionCellRef.current = null;
      setActiveCell(address);
      setInteractionCell(null);

      const cellElement = getAddressedElement(cellElementsRef.current, address);
      if (cellElement) {
        scrollElementIntoView(cellElement);
        lostOwnedFocusRef.current = null;
        cellElement.focus({ preventScroll: true });
        return Promise.resolve(completedResult);
      }

      const result = new Promise<DataGridCommandResult>((resolve) => {
        pendingFocusRef.current = { address, resolve };
      });
      return result;
    },
    [cancelPendingFocus, resolveAddress]
  );

  const scrollToCell = useCallback<DataGridApi['scrollToCell']>(
    (address) => {
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
    [resolveAddress]
  );

  const registerCell = useCallback(
    (address: DataGridCellAddress, element: HTMLDivElement | null) => {
      const previousElement = setAddressedElement(cellElementsRef.current, address, element);
      if (!element) {
        if (elementOwnsFocus(previousElement)) {
          lostOwnedFocusRef.current = address;
        }
        return;
      }

      const pendingFocus = pendingFocusRef.current;
      if (pendingFocus && areDataGridCellAddressesEqual(pendingFocus.address, address)) {
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
        lostOwnedFocusRef.current = null;
        scrollElementIntoView(element);
        element.focus({ preventScroll: true });
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
    [failPendingFocus, gridRef, resolveAddress]
  );

  const registerInteractionTarget = useCallback(
    (address: DataGridCellAddress, element: HTMLElement | null) => {
      const previousElement = setAddressedElement(interactionElementsRef.current, address, element);
      if (
        !element &&
        areDataGridCellAddressesEqual(interactionCellRef.current, address) &&
        elementOwnsFocus(previousElement)
      ) {
        interactionCellRef.current = null;
        setInteractionCell(null);
        const cellElement = getAddressedElement(cellElementsRef.current, address);
        if (cellElement) {
          cellElement.focus({ preventScroll: true });
        } else {
          lostOwnedFocusRef.current = address;
        }
      }
    },
    []
  );

  const enterNavigationMode = useCallback((address: DataGridCellAddress) => {
    pendingInteractionExitRef.current = null;
    activeCellRef.current = address;
    interactionCellRef.current = null;
    lostOwnedFocusRef.current = null;
    setActiveCell(address);
    setInteractionCell(null);
  }, []);

  const enterInteractionMode = useCallback(
    (address: DataGridCellAddress): boolean => {
      const interactionElement = getAddressedElement(interactionElementsRef.current, address);
      if (!interactionElement) {
        return false;
      }

      cancelPendingFocus('superseded');
      pendingInteractionExitRef.current = null;
      activeCellRef.current = address;
      interactionCellRef.current = address;
      lostOwnedFocusRef.current = null;
      setActiveCell(address);
      setInteractionCell(address);
      interactionElement.focus({ preventScroll: true });
      return true;
    },
    [cancelPendingFocus]
  );

  const deactivateInteractionMode = useCallback((address: DataGridCellAddress) => {
    if (!areDataGridCellAddressesEqual(interactionCellRef.current, address)) {
      return;
    }
    pendingInteractionExitRef.current = null;
    interactionCellRef.current = null;
    setInteractionCell(null);
  }, []);

  const leaveInteractionMode = useCallback((address: DataGridCellAddress) => {
    if (!areDataGridCellAddressesEqual(interactionCellRef.current, address)) {
      return;
    }
    pendingInteractionExitRef.current = address;
    interactionCellRef.current = null;
    setInteractionCell(null);
  }, []);

  useLayoutEffect(() => {
    const address = pendingInteractionExitRef.current;
    if (!address || interactionCell) {
      return;
    }
    pendingInteractionExitRef.current = null;
    void focusCell(address);
  }, [focusCell, interactionCell]);

  useLayoutEffect(() => {
    const previousModel = previousModelRef.current;
    const previousActiveCell = activeCellRef.current;
    const reconciledActiveCell = reconcileDataGridActiveCell(
      previousActiveCell,
      previousModel,
      currentModel
    );
    const logicalOrderChanged =
      !areIdListsEqual(previousModel.rowIds, rowIds) ||
      !areIdListsEqual(previousModel.columnIds, columnIds);
    previousModelRef.current = currentModel;

    const pendingFocus = pendingFocusRef.current;
    if (pendingFocus) {
      if (!rowIds.includes(pendingFocus.address.rowId)) {
        failPendingFocus('row_not_found');
      } else if (!columnIds.includes(pendingFocus.address.columnId)) {
        failPendingFocus('column_not_found');
      }
    }

    if (areDataGridCellAddressesEqual(previousActiveCell, reconciledActiveCell)) {
      if (logicalOrderChanged && lostOwnedFocusRef.current && reconciledActiveCell) {
        lostOwnedFocusRef.current = null;
        void focusCell(reconciledActiveCell);
      }
      return;
    }

    activeCellRef.current = reconciledActiveCell;
    interactionCellRef.current = null;
    setActiveCell(reconciledActiveCell);
    setInteractionCell(null);

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

    if (lostOwnedFocusRef.current) {
      lostOwnedFocusRef.current = null;
      void focusCell(reconciledActiveCell);
    }
  }, [columnIds, currentModel, failPendingFocus, focusCell, gridRef, rowIds]);

  useEffect(
    () => () => {
      cancelPendingFocus('grid_unmounted');
    },
    [cancelPendingFocus]
  );

  const api = useMemo<DataGridApi>(() => ({ focusCell, scrollToCell }), [focusCell, scrollToCell]);

  return {
    activeCell,
    interactionCell,
    api,
    focusCell,
    registerCell,
    registerInteractionTarget,
    enterNavigationMode,
    enterInteractionMode,
    deactivateInteractionMode,
    leaveInteractionMode,
  };
};
