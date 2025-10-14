/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataTableRecord, DataTableColumnsMeta } from '@kbn/discover-utils/types';

/**
 * Props for the JSONDataTable component
 */
export interface JSONDataTableProps {
  /**
   * The JSON data to display. Can be a single object, an array of objects, or any serializable value.
   * If an array is provided, only the first object will be displayed.
   * If a primitive value is provided, it will be wrapped in an object.
   */
  data: Record<string, unknown>;

  /**
   * The path prefix to use for the data paths.
   */
  pathPrefix: string;

  /**
   * Optional title for the data view. Defaults to 'JSON Data'
   */
  title?: string;

  /**
   * Optional columns to display. If not provided, all keys from the data will be used.
   */
  columns?: string[];

  /**
   * Optional custom column metadata for type information and formatting
   */
  columnsMeta?: DataTableColumnsMeta;

  /**
   * Whether to hide the actions column in the doc viewer. Defaults to true.
   */
  hideActionsColumn?: boolean;

  /**
   * Additional CSS class name for styling
   */
  className?: string;

  /**
   * Optional search term to filter the data
   */
  searchTerm?: string;

  /**
   * Test subject for testing purposes
   */
  'data-test-subj'?: string;
}

export interface JSONDataTableRecord extends DataTableRecord {
  flattened: {
    field: string;
    value: string;
    fieldType: string;
  };
}
