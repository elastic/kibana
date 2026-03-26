/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useMemo, useCallback } from 'react';
import { getAdaptedTableRows, useAdaptedTableRows, type Row } from '../table';
import type { GroupNode } from '../../../store_provider';

/**
 * Helper hook to get the ARIA attributes for the tree grid container to ensure a proper accessibility tree gets generated,
 * see {@link https://www.w3.org/WAI/ARIA/apg/patterns/treegrid/#wai-ariaroles,states,andproperties | TreeGrid WAI ARIA spec}
 */
export function useTreeGridContainerARIAAttributes(labelId: string) {
  return useMemo(
    () => ({
      role: 'treegrid',
      'aria-readonly': true,
      'aria-multiselectable': false,
      'aria-rowcount': -1,
      'aria-labelledby': labelId,
    }),
    [labelId]
  );
}

/**
 * Helper hook to get the required ARIA props for tree grid rows to ensure a proper accessibility tree gets generated,
 * see {@link https://www.w3.org/WAI/ARIA/apg/patterns/treegrid/#wai-ariaroles,states,andproperties | TreeGrid WAI ARIA spec}
 */
export function useTreeGridRowARIAAttributes<G extends GroupNode>({
  rowInstance,
  virtualRowIndex,
}: {
  rowInstance: Row<G>;
  virtualRowIndex: number;
}) {
  const { rowId, rowIsExpanded, rowDepth, rowChildren } = useAdaptedTableRows({
    rowInstance,
  });

  return useMemo(() => {
    return {
      id: rowId,
      role: 'row',
      tabIndex: 0,
      'aria-rowindex': virtualRowIndex + 1,
      'aria-expanded': rowIsExpanded,
      'aria-level': rowDepth + 1,
      'aria-setsize': rowChildren.length,
      'aria-posinset': rowDepth + 1,
      ...(rowChildren.length > 0 &&
        rowIsExpanded && {
          'aria-owns': rowChildren.map((row) => row.id).join(' '),
        }),
    };
  }, [rowId, rowIsExpanded, rowDepth, rowChildren, virtualRowIndex]);
}

/**
 * Utility hook to register accessibility helpers for the data cascade,
 * see {@link https://www.w3.org/WAI/ARIA/apg/patterns/treegrid/#keyboardinteraction | treegrid keyboard interaction}
 */
export function useRegisterCascadeAccessibilityHelpers<G extends GroupNode>({
  tableRows,
  tableWrapperElement,
  scrollToRowIndex,
}: {
  tableRows: Row<G>[];
  // element might be null on initialization
  tableWrapperElement: HTMLElement | null;
  scrollToRowIndex: (index: number) => void;
}) {
  // keyboard interactions handler for the tree grid
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.defaultPrevented) {
        return;
      }

      const isTriggeredDirectlyFromRow =
        (event.target as HTMLDivElement).getAttribute('role') === 'row';

      const matchingRow = isTriggeredDirectlyFromRow
        ? (event.target as HTMLDivElement)
        : (event.target as HTMLDivElement).closest('[role="row"]');

      const matchingRowId = matchingRow?.getAttribute('id');

      if (!matchingRowId) {
        return;
      }

      const matchingTableRow = tableRows.find((row) => row.id === matchingRowId);

      const { rowToggleFn, rowIsExpanded, rowChildrenCount, rowDepth } = getAdaptedTableRows({
        rowInstance: matchingTableRow!,
      });

      // Handle keyboard interactions from the element with the role of "row"
      if (isTriggeredDirectlyFromRow) {
        switch (event.key) {
          case 'ArrowRight': {
            if (!rowIsExpanded) {
              rowToggleFn();
            } else if (rowChildrenCount > 0) {
              let firstChildRow: HTMLElement | null = null;

              if (
                (firstChildRow =
                  matchingRow?.nextElementSibling as HTMLElement | null)?.getAttribute(
                  'aria-level'
                ) === String(rowDepth + 2)
              ) {
                // Focus the first child row
                firstChildRow?.focus();
              }
            }

            return event.preventDefault();
          }
          case 'ArrowLeft': {
            if (rowIsExpanded) {
              rowToggleFn();
            }

            return event.preventDefault();
          }
          case 'ArrowDown': {
            const nextRow = matchingRow?.nextElementSibling;

            // only act when the next row is within the cascade jurisdiction
            if (nextRow?.getAttribute('role') === 'row') {
              (nextRow as HTMLElement).focus();
            }

            return event.preventDefault();
          }
          case 'ArrowUp': {
            const previousRow = matchingRow?.previousElementSibling;

            // only act when the computed previous row is within the cascade jurisdiction
            if (previousRow?.getAttribute('role') === 'row') {
              (previousRow as HTMLElement).focus();
            }

            return event.preventDefault();
          }
          case 'Home': {
            scrollToRowIndex(0);
            // TODO: set focus on first row element after scroll has happened
            return event.preventDefault();
          }
          default: {
            // ignore other keys on the row
            return;
          }
        }
      }
    },
    [tableRows, scrollToRowIndex]
  );

  useEffect(() => {
    if (!tableWrapperElement) {
      return;
    }

    tableWrapperElement.addEventListener('keydown', handleKeyDown);

    return () => {
      tableWrapperElement?.removeEventListener('keydown', handleKeyDown);
    };
  }, [scrollToRowIndex, tableRows, tableWrapperElement, handleKeyDown]);
}
