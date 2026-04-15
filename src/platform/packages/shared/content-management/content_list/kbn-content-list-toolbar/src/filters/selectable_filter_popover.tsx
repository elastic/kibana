/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useRef } from 'react';
import {
  EuiSelectable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  type Query,
} from '@elastic/eui';
import { useFilterPopover, FilterPopover } from './filter_popover';
import { FilterPopoverHeader } from './filter_popover_header';
import {
  useFieldQueryFilter,
  isExcludeModifier,
  getCheckedState,
  ModifierKeyTip,
  FilterCountBadge,
  type FilterType,
} from './filter_utils';

// ─────────────────────────────────────────────────────────────────────────────
// Types.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Configuration for a selectable filter option.
 */
export interface SelectableFilterOption<T extends object = Record<string, unknown>> {
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
export interface SelectableFilterPopoverProps<T extends object = Record<string, unknown>> {
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
    }
  ) => React.ReactNode;
  /**
   * Single selection mode — only one value can be selected at a time.
   * Also hides the modifier key tip since exclude is not supported.
   *
   * @default false
   */
  singleSelection?: boolean;
  /** Whether the options are loading. */
  isLoading?: boolean;
  /** Empty state message to display. */
  emptyMessage?: string;
  /** No matches message to display. */
  noMatchesMessage?: string;
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
interface InternalSelectableOption<T extends object> {
  key: string;
  label: string;
  value: string;
  checked?: 'on' | 'off' | undefined;
  data?: T;
  count: number;
  view: React.ReactNode;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component.
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
 *   renderOption={(option, { isActive }) => (
 *     <StandardFilterOption count={option.count ?? 0} isActive={isActive}>
 *       <EuiHealth color={option.data.color}>{option.label}</EuiHealth>
 *     </StandardFilterOption>
 *   )}
 * />
 * ```
 */
export const SelectableFilterPopover = <T extends object = Record<string, unknown>>({
  fieldName,
  title,
  query,
  onChange,
  options,
  renderOption,
  singleSelection = false,
  isLoading,
  emptyMessage,
  noMatchesMessage,
  panelWidth,
  panelMinWidth,
  footerContent,
  'data-test-subj': dataTestSubj = 'selectableFilterPopover',
}: SelectableFilterPopoverProps<T>) => {
  const { isOpen, toggle, close } = useFilterPopover();
  const {
    selection,
    toggle: toggleValue,
    clearAll,
  } = useFieldQueryFilter({
    fieldName,
    query,
    onChange,
    singleSelection,
  });

  // Track the modifier key state from the most recent user interaction so
  // `handleSelectChange` can distinguish include from exclude. Capture-phase
  // handlers fire before `EuiSelectable` processes the event, guaranteeing
  // the ref is set before `onChange` runs.
  const lastModifierRef = useRef(false);
  const handleInteractionCapture = useCallback((e: React.MouseEvent | React.KeyboardEvent) => {
    lastModifierRef.current = isExcludeModifier(e);
  }, []);

  // Only count values that match an available option so the badge doesn't
  // reflect unresolved or stale query clauses (e.g. `tag:NonExistent`).
  const validOptionValues = useMemo(() => new Set(options.map((o) => o.value ?? o.key)), [options]);
  const activeCount = useMemo(
    () => Object.keys(selection).filter((value) => validOptionValues.has(value)).length,
    [selection, validOptionValues]
  );

  // Build selectable options with view rendering.
  const selectableOptions = useMemo((): Array<InternalSelectableOption<T>> => {
    return options.map((option) => {
      const value = option.value ?? option.key;
      const state: FilterType | undefined = selection[value];
      const checked = getCheckedState(state);
      const isActive = checked !== undefined;
      const count = option.count ?? 0;

      return {
        key: option.key,
        label: option.label,
        value,
        checked,
        data: option.data,
        count,
        view: renderOption(option, { checked, isActive }),
      };
    });
  }, [options, selection, renderOption]);

  // Build a lookup from key → checked state for stable comparison that
  // doesn't rely on index alignment (safe if `EuiSelectable` reorders options).
  const prevCheckedByKey = useMemo(() => {
    const map = new Map<string, 'on' | 'off' | undefined>();
    selectableOptions.forEach((opt) => map.set(opt.key, opt.checked));
    return map;
  }, [selectableOptions]);

  // Handle `EuiSelectable` change — reads modifier key state from
  // `lastModifierRef` to support Cmd/Ctrl+click for exclude.
  const handleSelectChange = useCallback(
    (updatedOptions: Array<InternalSelectableOption<T>>) => {
      const filterType: FilterType = lastModifierRef.current ? 'exclude' : 'include';

      if (singleSelection) {
        const newlyChecked = updatedOptions.find(
          (item) => item.checked === 'on' && prevCheckedByKey.get(item.key) !== 'on'
        );
        if (newlyChecked) {
          toggleValue(newlyChecked.value, filterType);
        } else {
          const unchecked = updatedOptions.find(
            (item) => item.checked !== 'on' && prevCheckedByKey.get(item.key) === 'on'
          );
          if (unchecked) {
            toggleValue(unchecked.value, filterType);
          }
        }
      } else {
        const changed = updatedOptions.find(
          (item) => item.checked !== prevCheckedByKey.get(item.key)
        );
        if (changed) {
          toggleValue(changed.value, filterType);
        }
      }
    },
    [prevCheckedByKey, toggleValue, singleSelection]
  );

  // Don't show count badge on button for single-select (only one value can be selected).
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
      <div
        onMouseDownCapture={handleInteractionCapture}
        onKeyDownCapture={handleInteractionCapture}
      >
        <EuiSelectable<InternalSelectableOption<T>>
          singleSelection={singleSelection}
          options={selectableOptions}
          renderOption={(option) => option.view}
          isLoading={isLoading}
          emptyMessage={emptyMessage}
          noMatchesMessage={noMatchesMessage}
          onChange={handleSelectChange}
          searchable
          searchProps={{ compressed: true }}
          data-test-subj={`${dataTestSubj}-list`}
          aria-label={title}
        >
          {(list, search) => (
            <>
              {singleSelection ? (
                <EuiPanel hasShadow={false} paddingSize="s">
                  {search}
                </EuiPanel>
              ) : (
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
      </div>
      {/* Only show modifier key tip for multi-select (exclude not supported in single-select). */}
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
  /** Item count. When `undefined`, the count badge is hidden entirely. */
  count?: number;
  /** Whether the filter is active. */
  isActive: boolean;
}

/**
 * Standard option layout with content and optional count badge.
 *
 * Include/exclude is handled by `SelectableFilterPopover`'s modifier key
 * tracking — no click handler is needed on individual options.
 */
export const StandardFilterOption = ({ children, count, isActive }: StandardOptionRenderProps) => {
  return (
    <EuiFlexGroup gutterSize="s" justifyContent="spaceBetween" alignItems="center">
      <EuiFlexItem grow={false}>{children}</EuiFlexItem>
      {count !== undefined && (
        <EuiFlexItem grow={false}>
          <FilterCountBadge count={count} isActive={isActive} />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
