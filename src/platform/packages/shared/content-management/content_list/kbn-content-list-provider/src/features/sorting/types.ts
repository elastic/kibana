/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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
}

/**
 * Sort option definition with explicit label, field, and direction.
 */
export interface SortOption {
  /** Display label for the sort option. */
  label: string;
  /** Field to sort by. */
  field: string;
  /** Sort direction. */
  direction: 'asc' | 'desc';
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

  /** Initial sort state. */
  initialSort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
}
