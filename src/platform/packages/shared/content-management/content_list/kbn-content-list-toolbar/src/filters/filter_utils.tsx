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
import { isMac } from '@kbn/shared-ux-utility';
import { i18n } from '@kbn/i18n';

// ─────────────────────────────────────────────────────────────────────────────
// Platform detection for modifier keys.
// ─────────────────────────────────────────────────────────────────────────────

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
// Filter types and utilities.
// ─────────────────────────────────────────────────────────────────────────────

export type FilterType = 'include' | 'exclude';
export type FilterSelection = Record<string, FilterType>;

/**
 * Converts a value to an array (handles single values and arrays).
 */
const toArray = (item: unknown): unknown[] => (Array.isArray(item) ? item : [item]);

/**
 * Maps filter state to `EuiSelectable` checked state.
 *
 * - `'include'` → `'on'` (green checkmark).
 * - `'exclude'` → `'off'` (red X).
 * - `undefined` → `undefined` (no indicator).
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
// `useFieldQueryFilter` hook.
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
   * Single selection mode — only one value can be selected at a time.
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
 */
export const useFieldQueryFilter = ({
  fieldName,
  query,
  onChange,
  singleSelection = false,
}: UseFieldQueryFilterOptions): UseFieldQueryFilterResult => {
  const parsedQuery = query ?? null;

  const selection = useMemo((): FilterSelection => {
    if (!parsedQuery) {
      return {};
    }

    const result: FilterSelection = {};

    // Read OR-field clauses (`field:(A or B)`) — the primary format written by the UI.
    const includeOrClause = parsedQuery.ast.getOrFieldClause(fieldName, undefined, true, 'eq');
    if (includeOrClause) {
      toArray(includeOrClause.value).forEach((v) => {
        result[String(v)] = 'include';
      });
    }

    const excludeOrClause = parsedQuery.ast.getOrFieldClause(fieldName, undefined, false, 'eq');
    if (excludeOrClause) {
      toArray(excludeOrClause.value).forEach((v) => {
        result[String(v)] = 'exclude';
      });
    }

    // Also read simple field clauses (`field:value` or `-field:value`) so that
    // values typed manually by the user are reflected as active in the popover.
    // Only write if the key isn't already captured by an OR-field clause above —
    // OR-clauses are the primary format written by the UI and take precedence.
    const simpleClauses = parsedQuery.ast.getFieldClauses(fieldName);
    if (simpleClauses) {
      simpleClauses.forEach((clause) => {
        const type: FilterType = clause.match === 'must' ? 'include' : 'exclude';
        toArray(clause.value).forEach((v) => {
          const key = String(v);
          if (!result[key]) {
            result[key] = type;
          }
        });
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
      // Use existing parsed query or create empty one.
      let q = parsedQuery ?? Query.parse('');
      const currentState = getState(value);

      // In single selection mode, clear all existing selections first.
      if (singleSelection) {
        // Remove both OR-field and simple field clauses so no stale values remain.
        q = q.removeOrFieldClauses(fieldName).removeSimpleFieldClauses(fieldName);
        // If clicking the already-selected value, just clear it (toggle off).
        if (currentState === targetType) {
          onChange?.(q);
          return;
        }
      } else {
        // Multi-select: remove the current value if it's already set.
        // Chain both removal methods to handle values written by the UI (OR-field)
        // and values typed manually by the user (simple field clause).
        if (currentState) {
          q = q.removeOrFieldValue(fieldName, value).removeSimpleFieldValue(fieldName, value);
        }
      }

      if (currentState !== targetType) {
        q = q.addOrFieldValue(fieldName, value, targetType === 'include', 'eq');
      }

      onChange?.(q);
    },
    [parsedQuery, getState, fieldName, onChange, singleSelection]
  );

  const clearAll = useCallback(() => {
    if (!parsedQuery) {
      return;
    }
    // Remove both OR-field clauses and simple field clauses (e.g. `field:value` typed manually).
    onChange?.(parsedQuery.removeOrFieldClauses(fieldName).removeSimpleFieldClauses(fieldName));
  }, [parsedQuery, fieldName, onChange]);

  return {
    selection,
    activeCount: Object.keys(selection).length,
    getState,
    toggle,
    clearAll,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// `ModifierKeyTip` component.
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
 * Footer component that displays the modifier key shortcut for exclude.
 */
export const ModifierKeyTip = ({ children }: ModifierKeyTipProps) => {
  return (
    <EuiPopoverFooter paddingSize="m">
      <EuiFlexGroup direction="column" alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem>
          <EuiText size="xs">
            <EuiTextColor color="subdued">
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
// `FilterCountBadge` component.
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
 * Badge that displays item counts in filter options.
 * Shows accent color when the filter is active, hollow when inactive.
 */
export const FilterCountBadge = ({ count, isActive }: FilterCountBadgeProps) => {
  return <EuiBadge color={isActive ? 'accent' : 'hollow'}>{count}</EuiBadge>;
};
