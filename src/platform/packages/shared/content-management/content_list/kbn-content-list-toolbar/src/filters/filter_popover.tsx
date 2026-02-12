/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useCallback } from 'react';
import {
  EuiPopover,
  EuiPopoverTitle,
  EuiFilterButton,
  useGeneratedHtmlId,
  type EuiFilterButtonProps,
} from '@elastic/eui';

// ─────────────────────────────────────────────────────────────────────────────
// Hook: useFilterPopover
// Manages popover open/close state.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook for managing filter popover open/close state.
 *
 * @returns An object containing `isOpen` state, `toggle` function, and `close` function.
 */
export const useFilterPopover = () => {
  const [isOpen, setIsOpen] = useState(false);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);
  const close = useCallback(() => setIsOpen(false), []);
  return { isOpen, toggle, close };
};

// ─────────────────────────────────────────────────────────────────────────────
// Component: FilterPopover
// Base component for filter popovers with common structure.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Props for the {@link FilterPopover} component.
 */
export interface FilterPopoverProps extends Pick<EuiFilterButtonProps, 'data-test-subj'> {
  /** Title displayed in the popover header. */
  title: string;
  /** Label displayed on the filter button (defaults to `title`). */
  buttonLabel?: string;
  /** Number of active filters (shows badge on button). */
  activeCount?: number;
  /** Whether the popover is open. */
  isOpen: boolean;
  /** Toggle popover open/closed. */
  onToggle: () => void;
  /** Close the popover. */
  onClose: () => void;
  /** Width of the popover panel. */
  panelWidth?: number | string;
  /** Minimum width of the popover panel. */
  panelMinWidth?: number | string;
  /** Anchor position for the popover. */
  anchorPosition?: 'downCenter' | 'downLeft' | 'downRight';
  /** Popover content. */
  children: React.ReactNode;
}

/**
 * `FilterPopover` component.
 *
 * Base component for filter popovers with consistent styling.
 *
 * Provides:
 * - `EuiPopover` with arrow and proper padding.
 * - `EuiFilterButton` with active filter badge.
 * - Bold title header with border.
 *
 * @param props - The component props. See {@link FilterPopoverProps}.
 * @returns A React element containing the filter popover.
 *
 * @example
 * ```tsx
 * const { isOpen, toggle, close } = useFilterPopover();
 *
 * <FilterPopover
 *   title="Sort by"
 *   isOpen={isOpen}
 *   onToggle={toggle}
 *   onClose={close}
 * >
 *   <EuiSelectable ...>{(list) => list}</EuiSelectable>
 * </FilterPopover>
 * ```
 */
export const FilterPopover = ({
  title,
  buttonLabel,
  activeCount = 0,
  isOpen,
  onToggle,
  onClose,
  panelWidth,
  panelMinWidth,
  anchorPosition = 'downCenter',
  'data-test-subj': dataTestSubj,
  children,
}: FilterPopoverProps) => {
  const titleId = useGeneratedHtmlId();

  const hasActiveFilters = activeCount > 0;

  // Build panel CSS from width props. Intentionally not memoized—the object
  // construction is trivial and `EuiPopover` does not rely on referential equality.
  const panelCSS =
    panelWidth || panelMinWidth
      ? {
          ...(panelWidth && { width: panelWidth }),
          ...(panelMinWidth && { minWidth: panelMinWidth }),
        }
      : undefined;

  return (
    <EuiPopover
      aria-labelledby={titleId}
      button={
        <EuiFilterButton
          iconType="arrowDown"
          iconSide="right"
          onClick={onToggle}
          data-test-subj={dataTestSubj}
          isSelected={isOpen}
          hasActiveFilters={hasActiveFilters}
          numActiveFilters={hasActiveFilters ? activeCount : undefined}
          grow
        >
          {buttonLabel ?? title}
        </EuiFilterButton>
      }
      isOpen={isOpen}
      closePopover={onClose}
      hasArrow
      panelPaddingSize="none"
      anchorPosition={anchorPosition}
      panelProps={panelCSS ? { css: panelCSS } : undefined}
    >
      <EuiPopoverTitle paddingSize="s" id={titleId}>
        {title}
      </EuiPopoverTitle>
      {children}
    </EuiPopover>
  );
};
