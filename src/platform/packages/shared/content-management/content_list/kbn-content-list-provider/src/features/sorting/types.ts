/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const SORT_DIRECTIONS = ['asc', 'desc'] as const;

/** The direction a sort is applied in. */
export type SortDirection = (typeof SORT_DIRECTIONS)[number];

/** Type guard for untrusted values (URL params, `localStorage`). */
export const isSortDirection = (value: string | undefined): value is SortDirection =>
  SORT_DIRECTIONS.some((direction) => direction === value);

/**
 * The state of a sort configuration.
 *
 * @property field - The field to sort by.
 * @property direction - The direction to sort in.
 */
export interface SortState {
  field: string;
  direction: SortDirection;
}

/**
 * Simplified sort field definition.
 *
 * The Sort component auto-generates asc/desc options from this definition.
 *
 * @example
 * ```ts
 * // Basic usage - labels auto-generated as "Name A-Z" / "Name Z-A".
 * { field: 'title', name: 'Name' }
 *
 * // Date fields auto-generate "Last updated (newest first)" / "(oldest first)".
 * { field: 'updatedAt', name: 'Last updated' }
 *
 * // Custom labels for non-standard fields.
 * { field: 'status', name: 'Status', ascLabel: 'Draft → Active', descLabel: 'Active → Draft' }
 * ```
 */
export interface SortField {
  /** Field to sort by (must match data field name). */
  field: string;
  /** Display name for the field (used to generate default labels). */
  name: string;
  /** Custom label for ascending sort (overrides auto-generated label). */
  ascLabel?: string;
  /** Custom label for descending sort (overrides auto-generated label). */
  descLabel?: string;
  /**
   * Restricts the directions offered in the sort dropdown. Omit to offer both.
   * Use single-direction arrays for fields where only one direction is meaningful.
   */
  allowedDirections?: readonly [SortDirection, ...Array<SortDirection>];
  /** When set, the field's dropdown options show a "?" icon with this help text as a tooltip. */
  description?: string;
}

/**
 * Gets the directions a sort field offers, in canonical order (`asc` before `desc`).
 * Both directions are offered when `allowedDirections` is omitted.
 */
export const getSortFieldDirections = ({
  allowedDirections,
}: SortField): ReadonlyArray<SortDirection> =>
  SORT_DIRECTIONS.filter(
    (direction) => !allowedDirections || allowedDirections.includes(direction)
  );

/**
 * Sort option definition with explicit label, field, and direction.
 */
export interface SortOption extends SortState {
  /** Display label for the sort option. */
  label: string;
}

/**
 * Sorting configuration.
 *
 * Use `fields` for the simpler API where asc/desc options are auto-generated.
 * Use `options` for full control over each dropdown option.
 */
export interface SortingConfig {
  /** Simplified sortable fields - auto-generates asc/desc options for each field. */
  fields?: SortField[];

  /**
   * Explicit sort options with full control over labels.
   * Ignored if `fields` is provided.
   */
  options?: SortOption[];

  /** Sort used when the user has not chosen one. A sort the user picked previously (saved per listing) takes precedence. */
  initialSort?: SortState;
}

/**
 * Default sort fields used when sorting is enabled but no explicit fields are configured.
 *
 * Provides Name (A-Z / Z-A) and Last updated (Newest / Oldest) sort options,
 * matching the common pattern across `TableListView` consumers.
 */
export const DEFAULT_SORT_FIELDS: SortField[] = [
  { field: 'title', name: 'Name' },
  { field: 'updatedAt', name: 'Last updated' },
];

/**
 * Default initial sort used when sorting is enabled but no explicit `initialSort` is configured.
 *
 * Sorts by `title` ascending (A-Z), matching `TableListView` behavior.
 * Consumers that prefer "newest first" can set `initialSort: { field: 'updatedAt', direction: 'desc' }`.
 */
export const DEFAULT_INITIAL_SORT: SortState = {
  field: 'title',
  direction: 'asc',
};
