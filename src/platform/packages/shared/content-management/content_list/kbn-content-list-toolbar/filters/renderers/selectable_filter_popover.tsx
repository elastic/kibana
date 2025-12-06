/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, type MouseEvent } from 'react';
import {
  EuiSelectable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  type Query,
} from '@elastic/eui';
import type { IdentityResolver } from '@kbn/content-list-provider';
import { useFilterPopover, FilterPopover, FilterPopoverHeader } from '../filter_popover';
import {
  useFieldQueryFilter,
  isExcludeModifier,
  getCheckedState,
  ModifierKeyTip,
  FilterCountBadge,
  type FilterType,
} from './filter_utils';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Configuration for a selectable filter option.
 */
export interface SelectableFilterOption<T extends Record<string, any> = Record<string, any>> {
  /** Unique key for the option. */
  key: string;
  /** Display label. */
  label: string;
  /** Value to store in the query (defaults to `key` if not provided). */
  value?: string;
  /** Item count for this option. */
  count?: number;
  /** Custom data associated with this option. */
  data?: T;
}

/**
 * Props for the {@link SelectableFilterPopover} component.
 */
export interface SelectableFilterPopoverProps<T extends Record<string, any> = Record<string, any>> {
  /** Field name in the query (e.g., `'tag'`, `'createdBy'`). */
  fieldName: string;
  /** Title displayed in the popover header and button. */
  title: string;
  /** Query object from `EuiSearchBar`. */
  query?: Query;
  /** Callback when filter changes. */
  onChange?: (query: Query) => void;
  /** Options to display. See {@link SelectableFilterOption}. */
  options: Array<SelectableFilterOption<T>>;
  /** Render function for option content. */
  renderOption: (
    option: SelectableFilterOption<T>,
    state: {
      checked: 'on' | 'off' | undefined;
      isActive: boolean;
      onClick: (e: MouseEvent) => void;
    }
  ) => React.ReactNode;
  /**
   * Single selection mode - only one value can be selected at a time.
   * When `true`, selecting a new value clears any previous selection.
   * Also hides the modifier key tip since exclude is not supported.
   *
   * @default false
   */
  singleSelection?: boolean;
  /**
   * Optional identity resolver for checking equivalence between filter values.
   * When provided, used to determine if an option's value matches any selected filter value.
   */
  resolver?: IdentityResolver;
  /** Whether the options are loading. */
  isLoading?: boolean;
  /** Loading message to display. */
  loadingMessage?: string;
  /** Empty state message to display. */
  emptyMessage?: string;
  /** No matches message to display. */
  noMatchesMessage?: string;
  /** Error message to display. */
  errorMessage?: string;
  /** Width of the popover panel. */
  panelWidth?: number;
  /** Minimum width of the popover panel. */
  panelMinWidth?: number;
  /** Optional footer content (rendered below {@link ModifierKeyTip}). */
  footerContent?: React.ReactNode;
  /** `data-test-subj` attribute for testing. */
  'data-test-subj'?: string;
}

/**
 * Internal interface for selectable options used within the popover.
 */
interface InternalSelectableOption<T extends Record<string, any>> {
  /** Unique key for the option. */
  key: string;
  /** Display label. */
  label: string;
  /** Value to store in the query. */
  value: string;
  /** Checked state for `EuiSelectable`. */
  checked?: 'on' | 'off' | undefined;
  /** Custom data associated with this option. */
  data?: T;
  /** Item count for this option. */
  count: number;
  /** Pre-rendered view for this option. */
  view: React.ReactNode;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * `SelectableFilterPopover` component.
 *
 * A reusable multi-select filter popover with include/exclude support.
 *
 * Provides:
 * - `EuiSelectable` with search.
 * - Include/exclude via modifier key (Cmd/Ctrl + click).
 * - Filter counts with active state badges.
 * - Standard header with selection count and clear button.
 * - Standard footer with modifier key tip.
 *
 * @param props - The component props. See {@link SelectableFilterPopoverProps}.
 * @returns A React element containing the filter popover.
 *
 * @example
 * ```tsx
 * <SelectableFilterPopover
 *   fieldName="tag"
 *   title="Tags"
 *   query={query}
 *   onChange={onChange}
 *   options={tags.map(tag => ({
 *     key: tag.id,
 *     label: tag.name,
 *     count: tagCounts[tag.name] ?? 0,
 *     data: tag,
 *   }))}
 *   renderOption={(option, { checked, isActive, onClick }) => (
 *     <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
 *       <EuiFlexItem onClick={onClick}>
 *         <EuiHealth color={option.data.color}>{option.label}</EuiHealth>
 *       </EuiFlexItem>
 *       <EuiFlexItem grow={false}>
 *         <FilterCountBadge count={option.count} isActive={isActive} />
 *       </EuiFlexItem>
 *     </EuiFlexGroup>
 *   )}
 * />
 * ```
 */
export const SelectableFilterPopover = <T extends Record<string, any> = Record<string, any>>({
  fieldName,
  title,
  query,
  onChange,
  options,
  renderOption,
  singleSelection = false,
  resolver,
  isLoading,
  loadingMessage,
  emptyMessage,
  noMatchesMessage,
  errorMessage,
  panelWidth,
  panelMinWidth,
  footerContent,
  'data-test-subj': dataTestSubj = 'selectableFilterPopover',
}: SelectableFilterPopoverProps<T>) => {
  const { isOpen, toggle, close } = useFilterPopover();
  const {
    selection,
    activeCount,
    toggle: toggleValue,
    clearAll,
  } = useFieldQueryFilter({
    fieldName,
    query,
    onChange,
    singleSelection,
  });

  /**
   * Find an equivalent value in the selection using the resolver.
   * Returns the selection key if found, otherwise undefined.
   */
  const findEquivalentSelection = useCallback(
    (value: string): { key: string; type: FilterType } | undefined => {
      // Direct match first.
      if (selection[value]) {
        return { key: value, type: selection[value] };
      }

      // If resolver exists, check for equivalent values.
      if (resolver) {
        for (const [existingKey, type] of Object.entries(selection)) {
          if (resolver.isSame(value, existingKey)) {
            return { key: existingKey, type };
          }
        }
      }

      return undefined;
    },
    [selection, resolver]
  );

  // Handle option click with modifier key support
  const handleOptionClick = useCallback(
    (value: string, e: MouseEvent) => {
      e.stopPropagation();
      toggleValue(value, isExcludeModifier(e) ? 'exclude' : 'include');
    },
    [toggleValue]
  );

  // Build selectable options with view rendering
  const selectableOptions = useMemo((): Array<InternalSelectableOption<T>> => {
    return options.map((option) => {
      const value = option.value ?? option.key;

      // Check for equivalent values using resolver (if provided).
      const equivalentSelection = findEquivalentSelection(value);
      const state = equivalentSelection?.type;
      const checked = getCheckedState(state);
      const isActive = checked !== undefined;
      const count = option.count ?? 0;

      // When clicking, if there's an equivalent already in the query, toggle that instead.
      const toggleTarget = equivalentSelection?.key ?? value;

      return {
        key: option.key,
        label: option.label,
        value,
        checked,
        data: option.data,
        count,
        view: renderOption(option, {
          checked,
          isActive,
          onClick: (e: MouseEvent) => handleOptionClick(toggleTarget, e),
        }),
      };
    });
  }, [options, findEquivalentSelection, renderOption, handleOptionClick]);

  // Handle EuiSelectable change (standard click without modifier)
  const handleSelectChange = useCallback(
    (updatedOptions: Array<InternalSelectableOption<T>>) => {
      // In single-selection mode, find the newly checked item (not the unchecked one)
      // This handles the case where clicking a new option unchecks the old one
      if (singleSelection) {
        const newlyChecked = updatedOptions.find(
          (item, i) => item.checked === 'on' && selectableOptions[i]?.checked !== 'on'
        );
        if (newlyChecked) {
          // Check for equivalent and toggle that instead.
          const equivalentSelection = findEquivalentSelection(newlyChecked.value);
          toggleValue(equivalentSelection?.key ?? newlyChecked.value, 'include');
        } else {
          // User clicked the already-selected item to deselect it
          const unchecked = updatedOptions.find(
            (item, i) => item.checked !== 'on' && selectableOptions[i]?.checked === 'on'
          );
          if (unchecked) {
            const equivalentSelection = findEquivalentSelection(unchecked.value);
            toggleValue(equivalentSelection?.key ?? unchecked.value, 'include');
          }
        }
      } else {
        // Multi-select: find any changed item
        const changed = updatedOptions.find(
          (item, i) => item.checked !== selectableOptions[i]?.checked
        );
        if (changed) {
          // Check for equivalent and toggle that instead.
          const equivalentSelection = findEquivalentSelection(changed.value);
          toggleValue(equivalentSelection?.key ?? changed.value, 'include');
        }
      }
    },
    [selectableOptions, toggleValue, singleSelection, findEquivalentSelection]
  );

  // Don't show count badge on button for single-select (only one value can be selected)
  const displayActiveCount = singleSelection ? 0 : activeCount;

  return (
    <FilterPopover
      title={title}
      activeCount={displayActiveCount}
      isOpen={isOpen}
      onToggle={toggle}
      onClose={close}
      panelWidth={panelWidth}
      panelMinWidth={panelMinWidth}
      data-test-subj={dataTestSubj}
    >
      <EuiSelectable<InternalSelectableOption<T>>
        singleSelection={singleSelection}
        options={selectableOptions}
        renderOption={(option) => option.view}
        isLoading={isLoading}
        loadingMessage={loadingMessage}
        emptyMessage={emptyMessage}
        noMatchesMessage={noMatchesMessage}
        errorMessage={errorMessage}
        onChange={handleSelectChange}
        searchable
        searchProps={{ compressed: true }}
        data-test-subj={`${dataTestSubj}-list`}
        aria-label={title}
      >
        {(list, search) => (
          <>
            {singleSelection ? (
              // Single-select: just show search, no selection count
              <EuiPanel hasShadow={false} paddingSize="s">
                {search}
              </EuiPanel>
            ) : (
              // Multi-select: show search with selection count and clear button
              <FilterPopoverHeader
                search={search}
                activeCount={activeCount}
                onClear={clearAll}
                data-test-subj={`${dataTestSubj}-clear`}
              />
            )}
            <EuiHorizontalRule margin="none" />
            {list}
          </>
        )}
      </EuiSelectable>
      {/* Only show modifier key tip for multi-select (exclude not supported in single-select) */}
      {!singleSelection && <ModifierKeyTip>{footerContent}</ModifierKeyTip>}
      {singleSelection && footerContent}
    </FilterPopover>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Standard option renderer with count badge.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Props for the {@link StandardFilterOption} component.
 */
export interface StandardOptionRenderProps {
  /** Primary content (e.g., name with icon/avatar). */
  children: React.ReactNode;
  /** Item count. */
  count: number;
  /** Whether the filter is active. */
  isActive: boolean;
  /** Click handler for the option. */
  onClick: (e: MouseEvent) => void;
}

/**
 * `StandardFilterOption` component.
 *
 * Standard option layout with clickable content and count badge.
 * Use this for consistent option rendering across filters.
 *
 * @param props - The component props. See {@link StandardOptionRenderProps}.
 * @returns A React element containing the standard filter option layout.
 */
export const StandardFilterOption = ({
  children,
  count,
  isActive,
  onClick,
}: StandardOptionRenderProps) => {
  return (
    <EuiFlexGroup gutterSize="s" justifyContent="spaceBetween" alignItems="center">
      <EuiFlexItem grow={false} onClick={onClick} style={{ cursor: 'pointer' }}>
        {children}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <FilterCountBadge count={count} isActive={isActive} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
