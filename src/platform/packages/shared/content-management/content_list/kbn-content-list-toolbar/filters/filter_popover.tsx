/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  EuiPopover,
  EuiPopoverTitle,
  EuiFilterButton,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiButtonEmpty,
  useEuiTheme,
  useGeneratedHtmlId,
  type EuiFilterButtonProps,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

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
// Hook: useFilterStyles
// Common CSS styles for filter popovers.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook for common CSS styles used in filter popovers.
 *
 * @returns An object containing CSS styles for filter popover components.
 */
export const useFilterStyles = () => {
  const { euiTheme } = useEuiTheme();

  return useMemo(
    () => ({
      /** CSS for adding margin-top to selection header when search is present. */
      selectionHeaderMarginCSS: css`
        margin-top: ${euiTheme.size.s};
      `,
    }),
    [euiTheme]
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Component: FilterSelectionHeader
// Displays "X selected" count and "Clear filter" button.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Props for the {@link FilterSelectionHeader} component.
 */
export interface FilterSelectionHeaderProps {
  /** Number of active filter selections. */
  activeCount: number;
  /** Callback to clear all selections. */
  onClear: () => void;
  /** `data-test-subj` attribute for the clear button. */
  'data-test-subj'?: string;
}

/**
 * `FilterSelectionHeader` component.
 *
 * Displays the selection count and clear filter button.
 * Used in multi-select filter popovers.
 *
 * @param props - The component props. See {@link FilterSelectionHeaderProps}.
 * @returns A React element containing the selection count and clear button.
 */
export const FilterSelectionHeader = ({
  activeCount,
  onClear,
  'data-test-subj': dataTestSubj,
}: FilterSelectionHeaderProps) => {
  const styles = useFilterStyles();
  const hasActiveFilters = activeCount > 0;

  return (
    <EuiFlexGroup
      alignItems="center"
      justifyContent="spaceBetween"
      gutterSize="s"
      responsive={false}
      css={styles.selectionHeaderMarginCSS}
    >
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued">
          {i18n.translate('contentManagement.contentList.filter.selectedCount', {
            defaultMessage: '{count, plural, =0 {0 selected} one {# selected} other {# selected}}',
            values: { count: activeCount },
          })}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        {hasActiveFilters && (
          <EuiButtonEmpty size="xs" flush="right" onClick={onClear} data-test-subj={dataTestSubj}>
            {i18n.translate('contentManagement.contentList.filter.clearFilter', {
              defaultMessage: 'Clear filter',
            })}
          </EuiButtonEmpty>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
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
 *   title="Status"
 *   activeCount={2}
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

  // Build panel CSS from width props.
  const panelCSS = useMemo(() => {
    if (!panelWidth && !panelMinWidth) {
      return undefined;
    }
    return {
      ...(panelWidth && { width: panelWidth }),
      ...(panelMinWidth && { minWidth: panelMinWidth }),
    };
  }, [panelWidth, panelMinWidth]);

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

// ─────────────────────────────────────────────────────────────────────────────
// Component: FilterPopoverHeader
// Header section with optional search and selection controls.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Props for the {@link FilterPopoverHeader} component.
 */
export interface FilterPopoverHeaderProps {
  /** Search element from `EuiSelectable`. */
  search?: React.ReactNode;
  /** Number of active filter selections. */
  activeCount: number;
  /** Callback to clear all selections. */
  onClear: () => void;
  /** `data-test-subj` attribute for the clear button. */
  'data-test-subj'?: string;
}

/**
 * `FilterPopoverHeader` component.
 *
 * Header section for filter popovers with search and selection controls.
 *
 * Includes:
 * - Optional search box (from `EuiSelectable`).
 * - "X selected" count.
 * - "Clear filter" button.
 *
 * @param props - The component props. See {@link FilterPopoverHeaderProps}.
 * @returns A React element containing the header with search and selection controls.
 *
 * @example
 * ```tsx
 * <EuiSelectable searchable>
 *   {(list, search) => (
 *     <>
 *       <FilterPopoverHeader
 *         search={search}
 *         activeCount={selectedCount}
 *         onClear={clearAll}
 *       />
 *       <EuiHorizontalRule margin="none" />
 *       {list}
 *     </>
 *   )}
 * </EuiSelectable>
 * ```
 */
export const FilterPopoverHeader = ({
  search,
  activeCount,
  onClear,
  'data-test-subj': dataTestSubj,
}: FilterPopoverHeaderProps) => {
  const styles = useFilterStyles();

  return (
    <EuiPanel hasShadow={false} paddingSize="s">
      {search}
      <FilterSelectionHeader
        activeCount={activeCount}
        onClear={onClear}
        data-test-subj={dataTestSubj}
        css={styles.selectionHeaderMarginCSS}
      />
    </EuiPanel>
  );
};
