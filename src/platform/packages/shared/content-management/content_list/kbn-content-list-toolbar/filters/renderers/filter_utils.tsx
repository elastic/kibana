/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useCallback } from 'react';
import {
  EuiPopoverFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiTextColor,
  EuiBadge,
  Query,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

// ─────────────────────────────────────────────────────────────────────────────
// Platform detection for modifier keys
// ─────────────────────────────────────────────────────────────────────────────

const isMac =
  typeof navigator !== 'undefined' && navigator.platform.toLowerCase().indexOf('mac') >= 0;

const modifierKeyPrefix = isMac ? '⌘' : '^';

/**
 * Checks if the exclude modifier key is pressed (Cmd on Mac, Ctrl on Windows/Linux).
 *
 * @param e - An event object containing `metaKey` and `ctrlKey` properties.
 * @returns `true` if the exclude modifier is pressed.
 */
export const isExcludeModifier = (e: { metaKey: boolean; ctrlKey: boolean }): boolean => {
  return (isMac && e.metaKey) || (!isMac && e.ctrlKey);
};

// ─────────────────────────────────────────────────────────────────────────────
// Filter types and utilities
// ─────────────────────────────────────────────────────────────────────────────

export type FilterType = 'include' | 'exclude';
export type FilterSelection = Record<string, FilterType>;

/**
 * Converts a value to an array (handles single values and arrays).
 *
 * @param item - The item to convert.
 * @returns An array containing the item, or the item itself if already an array.
 */
const toArray = (item: unknown): unknown[] => (Array.isArray(item) ? item : [item]);

/**
 * Maps filter state to `EuiSelectable` checked state.
 *
 * - `'include'` → `'on'` (green checkmark).
 * - `'exclude'` → `'off'` (red X).
 * - `undefined` → `undefined` (no indicator).
 *
 * @param state - The filter type state to map.
 * @returns The corresponding `EuiSelectable` checked state.
 */
export const getCheckedState = (state: FilterType | null | undefined): 'on' | 'off' | undefined => {
  if (state === 'include') {
    return 'on';
  }
  if (state === 'exclude') {
    return 'off';
  }
  return undefined;
};

// ─────────────────────────────────────────────────────────────────────────────
// useFieldQueryFilter hook
// Generic hook for managing include/exclude filter state via `EuiSearchBar` query.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Options for the {@link useFieldQueryFilter} hook.
 */
export interface UseFieldQueryFilterOptions {
  /** The field name in the query (e.g., `'tag'`, `'createdBy'`). */
  fieldName: string;
  /** Query object from `EuiSearchBar`. */
  query?: Query;
  /** Callback when filter changes. */
  onChange?: (query: Query) => void;
  /**
   * Single selection mode - only one value can be selected at a time.
   * When `true`, selecting a new value clears any previous selection.
   *
   * @default false
   */
  singleSelection?: boolean;
}

/**
 * Result object returned by the {@link useFieldQueryFilter} hook.
 */
export interface UseFieldQueryFilterResult {
  /** Map of value to {@link FilterType} (`'include'` or `'exclude'`). */
  selection: FilterSelection;
  /** Number of active filters. */
  activeCount: number;
  /** Gets the current state of a value. */
  getState: (value: string) => FilterType | null;
  /** Toggles a value's filter state. */
  toggle: (value: string, targetType: FilterType) => void;
  /** Clears all filters for this field. */
  clearAll: () => void;
}

/**
 * Generic hook for managing include/exclude filter state.
 *
 * Works with `EuiSearchBar`'s `query`/`onChange` pattern to sync filter state
 * with the search query text.
 *
 * @param options - The hook options. See {@link UseFieldQueryFilterOptions}.
 * @returns A {@link UseFieldQueryFilterResult} object with filter state and methods.
 *
 * @example
 * ```tsx
 * const { selection, toggle, clearAll } = useFieldQueryFilter({
 *   fieldName: 'tag',
 *   query,
 *   onChange,
 * });
 * ```
 */
export const useFieldQueryFilter = ({
  fieldName,
  query,
  onChange,
  singleSelection = false,
}: UseFieldQueryFilterOptions): UseFieldQueryFilterResult => {
  const queryText = query?.text ?? '';

  // Track both the parsed query and whether there was a parse error
  // Empty query is valid (not an error), but invalid syntax is an error
  const { parsedQuery, hasParseError } = useMemo(() => {
    if (!queryText) {
      // Empty query is valid - not an error
      return { parsedQuery: null, hasParseError: false };
    }
    try {
      return { parsedQuery: Query.parse(queryText), hasParseError: false };
    } catch {
      // Non-empty query that fails to parse is an error
      return { parsedQuery: null, hasParseError: true };
    }
  }, [queryText]);

  const selection = useMemo((): FilterSelection => {
    if (!parsedQuery) {
      return {};
    }

    const result: FilterSelection = {};

    const includeClause = parsedQuery.ast.getOrFieldClause(fieldName, undefined, true, 'eq');
    if (includeClause) {
      toArray(includeClause.value).forEach((v) => {
        result[String(v)] = 'include';
      });
    }

    const excludeClause = parsedQuery.ast.getOrFieldClause(fieldName, undefined, false, 'eq');
    if (excludeClause) {
      toArray(excludeClause.value).forEach((v) => {
        result[String(v)] = 'exclude';
      });
    }

    return result;
  }, [parsedQuery, fieldName]);

  const getState = useCallback(
    (value: string): FilterType | null => selection[value] ?? null,
    [selection]
  );

  const toggle = useCallback(
    (value: string, targetType: FilterType) => {
      // Don't modify when query has parse error - preserve the user's in-progress text
      if (hasParseError) {
        return;
      }

      // Use existing parsed query or create empty one
      let q = parsedQuery ?? Query.parse('');
      const currentState = getState(value);

      // In single selection mode, clear all existing selections first
      if (singleSelection) {
        q = q.removeOrFieldClauses(fieldName);
        // If clicking the already-selected value, just clear it (toggle off)
        if (currentState === targetType) {
          onChange?.(q);
          return;
        }
      } else {
        // Multi-select: just remove the current value if it's already set
        if (currentState) {
          q = q.removeOrFieldValue(fieldName, value);
        }
      }

      if (currentState !== targetType) {
        q = q.addOrFieldValue(fieldName, value, targetType === 'include', 'eq');
      }

      onChange?.(q);
    },
    [hasParseError, parsedQuery, getState, fieldName, onChange, singleSelection]
  );

  const clearAll = useCallback(() => {
    // Don't modify when query has parse error - preserve the user's in-progress text
    if (hasParseError || !parsedQuery) {
      return;
    }
    onChange?.(parsedQuery.removeOrFieldClauses(fieldName));
  }, [hasParseError, parsedQuery, fieldName, onChange]);

  return {
    selection,
    activeCount: Object.keys(selection).length,
    getState,
    toggle,
    clearAll,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// ModifierKeyTip component
// Footer component showing the keyboard shortcut for exclude.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Props for the {@link ModifierKeyTip} component.
 */
export interface ModifierKeyTipProps {
  /** Optional additional content to display below the tip. */
  children?: React.ReactNode;
}

/**
 * `ModifierKeyTip` component.
 *
 * Footer component that displays the modifier key shortcut for exclude.
 * Used in filter popovers to inform users how to exclude items.
 *
 * @param props - The component props. See {@link ModifierKeyTipProps}.
 * @returns A React element containing the modifier key tip.
 *
 * @example
 * ```tsx
 * // Basic usage.
 * <ModifierKeyTip />
 *
 * // With additional content.
 * <ModifierKeyTip>
 *   <EuiLink href="/app/tags">Manage tags</EuiLink>
 * </ModifierKeyTip>
 * ```
 */
export const ModifierKeyTip = ({ children }: ModifierKeyTipProps) => {
  return (
    <EuiPopoverFooter paddingSize="m">
      <EuiFlexGroup direction="column" alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem>
          <EuiText size="xs">
            <EuiTextColor color="dimgrey">
              {i18n.translate('contentManagement.contentList.filter.modifierKeyHelpText', {
                defaultMessage: '{modifierKeyPrefix} + click exclude',
                values: { modifierKeyPrefix },
              })}
            </EuiTextColor>
          </EuiText>
        </EuiFlexItem>
        {children}
      </EuiFlexGroup>
    </EuiPopoverFooter>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// FilterCountBadge component
// Badge showing item count, changes color when filter is active.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Props for the {@link FilterCountBadge} component.
 */
export interface FilterCountBadgeProps {
  /** Number of items matching this filter option. */
  count: number;
  /** Whether this filter option is currently active (included or excluded). */
  isActive: boolean;
}

/**
 * `FilterCountBadge` component.
 *
 * Badge component that displays item counts in filter options.
 * Shows accent color when the filter is active, hollow when inactive.
 *
 * @param props - The component props. See {@link FilterCountBadgeProps}.
 * @returns A React element containing the count badge.
 */
export const FilterCountBadge = ({ count, isActive }: FilterCountBadgeProps) => {
  return <EuiBadge color={isActive ? 'accent' : 'hollow'}>{count}</EuiBadge>;
};
