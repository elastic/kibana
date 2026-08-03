import React from 'react';
import { Query } from '@elastic/eui';
/**
 * Checks if the exclude modifier key is pressed (Cmd on Mac, Ctrl on Windows/Linux).
 *
 * @param e - An event object containing `metaKey` and `ctrlKey` properties.
 * @returns `true` if the exclude modifier is pressed.
 */
export declare const isExcludeModifier: (e: {
    metaKey: boolean;
    ctrlKey: boolean;
}) => boolean;
export type FilterType = 'include' | 'exclude';
export type FilterSelection = Record<string, FilterType>;
/**
 * Maps filter state to `EuiSelectable` checked state.
 *
 * - `'include'` → `'on'` (green checkmark).
 * - `'exclude'` → `'off'` (red X).
 * - `undefined` → `undefined` (no indicator).
 */
export declare const getCheckedState: (state: FilterType | null | undefined) => "on" | "off" | undefined;
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
export declare const useFieldQueryFilter: ({ fieldName, query, onChange, singleSelection, }: UseFieldQueryFilterOptions) => UseFieldQueryFilterResult;
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
export declare const ModifierKeyTip: ({ children }: ModifierKeyTipProps) => React.JSX.Element;
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
export declare const FilterCountBadge: ({ count, isActive }: FilterCountBadgeProps) => React.JSX.Element;
