/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FieldSpec } from '@kbn/data-views-plugin/common';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';

const SPATIAL_FIELDS = ['geo_point', 'geo_shape', 'point', 'shape'];
const SOURCE_FIELD = '_source';
const TSDB_COUNTER_FIELDS_PREFIX = 'counter_';
const UNKNOWN_FIELD = 'unknown';

/**
 * Check if a column is sortable.
 *
 * @param column The DatatableColumn of the field.
 * @returns True if the column is sortable, false otherwise.
 */

export const isESQLColumnSortable = (column: DatatableColumn): boolean => {
  // We don't allow sorting on spatial fields
  if (SPATIAL_FIELDS.includes(column.meta?.type)) {
    return false;
  }

  // we don't allow sorting on the _source field
  if (column.meta?.type === SOURCE_FIELD) {
    return false;
  }

  // we don't allow sorting on tsdb counter fields
  if (column.meta?.esType && column.meta?.esType?.indexOf(TSDB_COUNTER_FIELDS_PREFIX) !== -1) {
    return false;
  }

  return true;
};

// Helper function to check if a field is groupable based on its type and esType
const isGroupable = (type: string | undefined, esType: string | undefined): boolean => {
  // we don't allow grouping on the unknown field types
  if (type === UNKNOWN_FIELD) {
    return false;
  }
  // we don't allow grouping on tsdb counter fields
  if (esType && esType.indexOf(TSDB_COUNTER_FIELDS_PREFIX) !== -1) {
    return false;
  }
  return true;
};

/**
 * Check if a column is groupable (| STATS ... BY <column>).
 *
 * @param column The DatatableColumn of the field.
 * @returns True if the column is groupable, false otherwise.
 */
export const isESQLColumnGroupable = (column: DatatableColumn): boolean => {
  return isGroupable(column.meta?.type, column.meta?.esType);
};

export const isESQLFieldGroupable = (field: FieldSpec): boolean => {
  if (field.timeSeriesMetric === 'counter') return false;
  return isGroupable(field.type, field.esTypes?.[0]);
};
