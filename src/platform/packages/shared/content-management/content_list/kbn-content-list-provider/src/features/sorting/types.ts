/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Simplified sort field definition - just the field name and display name.
 * The Sort component will auto-generate asc/desc options from this.
 *
 * @example
 * // Basic usage - labels auto-generated as "Name A-Z" / "Name Z-A"
 * { field: 'title', name: 'Name' }
 *
 * // Date fields auto-generate "Last updated (newest first)" / "(oldest first)"
 * { field: 'updatedAt', name: 'Last updated' }
 *
 * // Custom labels for non-standard fields
 * { field: 'status', name: 'Status', ascLabel: 'Status: Draft → Active', descLabel: 'Status: Active → Draft' }
 */
export interface SortField {
  /** Field to sort by (must match column id or data field) */
  field: string;
  /** Display name for the field (used to generate default labels like "Name A-Z") */
  name: string;
  /** Custom label for ascending sort (overrides auto-generated label) */
  ascLabel?: string;
  /** Custom label for descending sort (overrides auto-generated label) */
  descLabel?: string;
}

/**
 * Default sort fields - spread these to include standard sorting options.
 *
 * @example
 * import { DEFAULT_SORT_FIELDS } from '@kbn/content-list-provider';
 *
 * sorting={{
 *   fields: [
 *     ...DEFAULT_SORT_FIELDS,  // Includes title, updatedAt
 *     { field: 'status', name: 'Status' },  // Add custom fields
 *   ],
 * }}
 */
export const DEFAULT_SORT_FIELDS: SortField[] = [
  { field: 'title', name: 'Name' },
  { field: 'updatedAt', name: 'Last updated' },
];

/**
 * Sort option definition - each option specifies a complete sort configuration
 * including the display label, field, and direction.
 *
 * @example
 * // Title sorting options
 * { label: 'Name A-Z', field: 'title', direction: 'asc' }
 * { label: 'Name Z-A', field: 'title', direction: 'desc' }
 *
 * @example
 * // Date sorting options
 * { label: 'Recently updated', field: 'updatedAt', direction: 'desc' }
 * { label: 'Least recently updated', field: 'updatedAt', direction: 'asc' }
 */
export interface SortOption {
  /** Display label for the sort option */
  label: string;
  /** Field to sort by */
  field: string;
  /** Sort direction */
  direction: 'asc' | 'desc';
}

/**
 * Sorting configuration - supports either simplified fields or explicit options.
 *
 * Use `fields` for the simpler API where asc/desc options are auto-generated.
 * Use `options` for full control over each dropdown option.
 * If both are provided, `fields` takes precedence.
 */
export interface SortingConfig {
  /**
   * Simplified sortable fields - auto-generates asc/desc options for each field.
   * Use DEFAULT_SORT_FIELDS to include standard fields.
   *
   * @example
   * fields: [...DEFAULT_SORT_FIELDS, { field: 'status', name: 'Status' }]
   */
  fields?: SortField[];

  /**
   * Explicit sort options with full control over labels.
   * Ignored if `fields` is provided.
   * Note: Prefer using `fields` for simpler configuration.
   */
  options?: SortOption[];

  /** Initial sort state */
  initialSort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
}
