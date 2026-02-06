/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FieldSpec } from '@kbn/data-views-plugin/common';
import { isAssignment, isColumn, LeafPrinter, singleItems, Walker } from '@kbn/esql-language';
import type {
  ESQLColumn,
  ESQLList,
  ESQLLiteral,
  ESQLProperNode,
} from '@kbn/esql-language/src/types';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';

const SPATIAL_FIELDS = ['geo_point', 'geo_shape', 'point', 'shape'];
const SOURCE_FIELD = '_source';
const TSDB_COUNTER_FIELDS_PREFIX = 'counter_';
const UNKNOWN_FIELD = 'unknown';
const HISTOGRAM_FIELDS = ['exponential_histogram', 'tdigest'];

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
  // we don't allow grouping on histogram fields (pre-aggregated data)
  if (type && HISTOGRAM_FIELDS.includes(type)) {
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

/**
 * Returns the expression that defines the value of the field.
 *
 * If the field is defined using an assignement expression, it returns the right side of the assignment.
 * i.e. in `STATS foo = bar + 1`, it returns `bar + 1`.
 *
 * If the field is not defined using an assignment, it returns the field argument itself.
 * i.e. in `STATS count()`, it returns `count()`.
 */
export const getFieldDefinitionFromArg = (fieldArgument: ESQLProperNode): ESQLProperNode => {
  if (isAssignment(fieldArgument) && isColumn(fieldArgument.args[0])) {
    const [_, definition] = singleItems(fieldArgument.args);
    return definition;
  }
  return fieldArgument;
};

export type Terminal = ESQLColumn | ESQLLiteral | ESQLList;
/**
 * Retrieves a list of terminal nodes that were found in the field definition.
 */
export const getFieldTerminals = (fieldArgument: ESQLProperNode) => {
  const terminals: Array<Terminal> = [];

  const definition = getFieldDefinitionFromArg(fieldArgument);

  Walker.walk(definition, {
    visitLiteral(node) {
      terminals.push(node);
    },
    visitColumn(node) {
      terminals.push(node);
    },
    visitListLiteral(node) {
      terminals.push(node);
    },
  });

  return terminals;
};

/**
 * Retrieves a formatted list of field names which were used for the new field
 * construction. For example, in the below example, `x` and `y` are the
 * existing "used" fields:
 *
 * ```
 * STATS foo = agg(x) BY y, bar = x
 * ```
 */
export const getUsedFields = (fieldArgument: ESQLProperNode) => {
  const usedFields: Set<string> = new Set();

  const definition = getFieldDefinitionFromArg(fieldArgument);

  Walker.walk(definition, {
    visitColumn(node) {
      usedFields.add(LeafPrinter.column(node));
    },
  });

  return usedFields;
};
