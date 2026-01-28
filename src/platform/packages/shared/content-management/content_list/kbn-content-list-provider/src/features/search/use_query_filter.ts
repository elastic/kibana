/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useMemo } from 'react';
import { Query } from '@elastic/eui';
import { useContentListSearch } from './use_content_list_search';
import type { IdentityResolver } from './use_identity_resolver';

/** Convert value to array if not already. */
const toArray = (item: unknown): unknown[] => (Array.isArray(item) ? item : [item]);

export type QueryFilterType = 'include' | 'exclude';

export interface UseQueryFilterOptions {
  /**
   * Whether to support exclude mode (e.g., -field:value or field:-value).
   * When true, the filter supports both include and exclude operations.
   * @default false
   */
  supportsExclude?: boolean;

  /**
   * Optional identity resolver for deduplicating filter values.
   * When provided, the hook will check if a value being toggled is equivalent
   * to an existing value (same canonical form) and toggle the existing value instead.
   */
  resolver?: IdentityResolver;
}

export interface QueryFilterState {
  /** Currently selected values with their filter type (include/exclude). */
  selection: Record<string, QueryFilterType>;
  /** Array of currently selected values (include only). */
  selectedValues: string[];
  /** Array of excluded values (exclude only). */
  excludedValues: string[];
  /** Total count of active filters (include + exclude). */
  activeCount: number;
}

export interface QueryFilterActions {
  /**
   * Toggle a value's filter state.
   * If not selected, adds as include (or specified type).
   * If already in same state, removes it.
   * If in different state, moves to new state.
   */
  toggle: (value: string, type?: QueryFilterType) => void;
  /**
   * Set multiple values at once (replaces current selection for the specified type)
   */
  setValues: (values: string[], type?: QueryFilterType) => void;
  /**
   * Add a value to the filter
   */
  addValue: (value: string, type?: QueryFilterType) => void;
  /**
   * Remove a value from the filter
   */
  removeValue: (value: string) => void;
  /**
   * Clear all values for this filter field
   */
  clearAll: () => void;
  /**
   * Get the current filter type for a specific value
   */
  getValueState: (value: string) => QueryFilterType | null;
}

/**
 * Generic hook for managing query-based filters.
 *
 * This hook provides a reusable way for filter components to integrate with the
 * EuiSearchBar query text. It handles parsing and manipulating `field:value` clauses
 * in the query string.
 *
 * @param fieldName - The field name to use in the query (e.g., `tag`, `createdBy`, `status`).
 * @param options - Configuration options for the filter.
 * @returns Object containing state (`selection`, `selectedValues`, `excludedValues`, `activeCount`)
 *   and actions (`toggle`, `setValues`, `addValue`, `removeValue`, `clearAll`, `getValueState`).
 *
 * @example Basic usage (include only)
 * ```tsx
 * function StatusFilter() {
 *   const { selectedValues, toggle, clearAll } = useQueryFilter('status');
 *
 *   return (
 *     <EuiFilterGroup>
 *       {['active', 'archived'].map(status => (
 *         <EuiFilterButton
 *           key={status}
 *           hasActiveFilters={selectedValues.includes(status)}
 *           onClick={() => toggle(status)}
 *         >
 *           {status}
 *         </EuiFilterButton>
 *       ))}
 *       <EuiButtonEmpty onClick={clearAll}>Clear</EuiButtonEmpty>
 *     </EuiFilterGroup>
 *   );
 * }
 * ```
 *
 * @example With exclude support (like tags)
 * ```tsx
 * function TagFilter() {
 *   const { selection, toggle, getValueState } = useQueryFilter('tag', { supportsExclude: true });
 *
 *   const handleClick = (tag: string, e: MouseEvent) => {
 *     // Cmd/Ctrl + click to exclude
 *     const type = e.metaKey || e.ctrlKey ? 'exclude' : 'include';
 *     toggle(tag, type);
 *   };
 *
 *   return (
 *     <div>
 *       {tags.map(tag => (
 *         <EuiBadge
 *           key={tag}
 *           color={getValueState(tag) === 'exclude' ? 'danger' : 'default'}
 *           onClick={(e) => handleClick(tag, e)}
 *         >
 *           {tag}
 *         </EuiBadge>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export const useQueryFilter = (
  fieldName: string,
  options: UseQueryFilterOptions = {}
): QueryFilterState & QueryFilterActions => {
  const { supportsExclude = false, resolver } = options;
  const { queryText, setSearch } = useContentListSearch();

  // Parse query once, memoized.
  const query = useMemo(() => {
    if (!queryText) {
      return null;
    }
    try {
      return Query.parse(queryText);
    } catch {
      return null;
    }
  }, [queryText]);

  // Derive selection directly from query.
  const selection = useMemo((): Record<string, QueryFilterType> => {
    if (!query) {
      return {};
    }

    const result: Record<string, QueryFilterType> = {};

    // Get include clauses.
    const includeClause = query.ast.getOrFieldClause(fieldName, undefined, true, 'eq');
    if (includeClause) {
      toArray(includeClause.value).forEach((val) => {
        result[val as string] = 'include';
      });
    }

    // Get exclude clauses (if supported).
    if (supportsExclude) {
      const excludeClause = query.ast.getOrFieldClause(fieldName, undefined, false, 'eq');
      if (excludeClause) {
        toArray(excludeClause.value).forEach((val) => {
          result[val as string] = 'exclude';
        });
      }
    }

    return result;
  }, [query, fieldName, supportsExclude]);

  // Derive arrays from selection.
  const selectedValues = useMemo(
    () =>
      Object.entries(selection)
        .filter(([, type]) => type === 'include')
        .map(([val]) => val),
    [selection]
  );

  const excludedValues = useMemo(
    () =>
      Object.entries(selection)
        .filter(([, type]) => type === 'exclude')
        .map(([val]) => val),
    [selection]
  );

  const activeCount = useMemo(() => Object.keys(selection).length, [selection]);

  // Get current filter type for a value.
  // If resolver is available, also checks for equivalent values.
  const getValueState = useCallback(
    (value: string): QueryFilterType | null => {
      // Direct lookup first.
      if (selection[value]) {
        return selection[value];
      }

      // If resolver exists, check for equivalent values.
      if (resolver) {
        for (const [existing, type] of Object.entries(selection)) {
          if (resolver.isSame(value, existing)) {
            return type;
          }
        }
      }

      return null;
    },
    [selection, resolver]
  );

  /**
   * Find an existing value that is equivalent to the given value using the resolver.
   * Returns the existing value in the query if found, otherwise undefined.
   */
  const findEquivalentValue = useCallback(
    (value: string): string | undefined => {
      if (!resolver) {
        return undefined;
      }

      // Check all selected and excluded values for equivalence.
      const allValues = [...selectedValues, ...excludedValues];
      for (const existing of allValues) {
        if (resolver.isSame(value, existing)) {
          return existing;
        }
      }
      return undefined;
    },
    [resolver, selectedValues, excludedValues]
  );

  // Toggle a value's filter state.
  const toggle = useCallback(
    (value: string, targetType: QueryFilterType = 'include') => {
      let q = query ?? Query.parse('');

      // If resolver exists, check for an equivalent value already in the filter.
      const equivalentValue = findEquivalentValue(value);
      const targetValue = equivalentValue ?? value;
      const currentState = getValueState(targetValue);

      // Always remove from current position first.
      if (currentState) {
        q = q.removeOrFieldValue(fieldName, targetValue);
      }

      // Add to new position if not already in target state (toggle behavior).
      // Use the original value for display (not the equivalent), unless removing.
      if (currentState !== targetType) {
        const isInclude = targetType === 'include';
        // Use the value as provided for display purposes.
        q = q.addOrFieldValue(fieldName, value, isInclude, 'eq');
      }

      setSearch(q.text);
    },
    [query, fieldName, getValueState, setSearch, findEquivalentValue]
  );

  // Add a value.
  const addValue = useCallback(
    (value: string, type: QueryFilterType = 'include') => {
      let q = query ?? Query.parse('');

      // Check for equivalent value using resolver.
      const equivalentValue = findEquivalentValue(value);
      const targetValue = equivalentValue ?? value;
      const currentState = getValueState(targetValue);

      // Remove if already exists in different state.
      if (currentState && currentState !== type) {
        q = q.removeOrFieldValue(fieldName, targetValue);
      }

      // Add if not already in this state.
      if (currentState !== type) {
        const isInclude = type === 'include';
        q = q.addOrFieldValue(fieldName, value, isInclude, 'eq');
        setSearch(q.text);
      }
    },
    [query, fieldName, getValueState, setSearch, findEquivalentValue]
  );

  // Remove a value.
  const removeValue = useCallback(
    (value: string) => {
      if (!query) {
        return;
      }

      // Check for equivalent value using resolver.
      const equivalentValue = findEquivalentValue(value);
      const targetValue = equivalentValue ?? value;

      const q = query.removeOrFieldValue(fieldName, targetValue);
      setSearch(q.text);
    },
    [query, fieldName, setSearch, findEquivalentValue]
  );

  // Set multiple values at once (replaces current selection for the specified type only).
  // Preserves values of the opposite type (e.g., setting includes preserves excludes).
  const setValues = useCallback(
    (values: string[], type: QueryFilterType = 'include') => {
      let q = query ?? Query.parse('');
      const isInclude = type === 'include';

      // Remove only the values of the specified type, preserving the opposite type.
      // We need to remove existing values of the same type before adding new ones.
      const valuesToRemove = isInclude ? selectedValues : excludedValues;
      valuesToRemove.forEach((value) => {
        q = q.removeOrFieldValue(fieldName, value);
      });

      // Add all new values.
      values.forEach((value) => {
        q = q.addOrFieldValue(fieldName, value, isInclude, 'eq');
      });

      setSearch(q.text);
    },
    [query, fieldName, setSearch, selectedValues, excludedValues]
  );

  // Clear all values for this field.
  const clearAll = useCallback(() => {
    if (!query) {
      return;
    }
    setSearch(query.removeOrFieldClauses(fieldName).text);
  }, [query, fieldName, setSearch]);

  return {
    // State.
    selection,
    selectedValues,
    excludedValues,
    activeCount,
    // Actions.
    toggle,
    setValues,
    addValue,
    removeValue,
    clearAll,
    getValueState,
  };
};
