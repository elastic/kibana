/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FieldSpec } from '@kbn/data-views-plugin/common';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import type { Column } from './types';

// LIMIT 0 reports no aggregatability. Heuristic for KQL value suggestions (_terms_enum / terms agg):
// analyzed text types can't be suggested, `unsupported` types are unknown. Exact only with field caps.
const NON_AGGREGATABLE_ES_TYPES: ReadonlySet<string> = new Set([
  'text',
  'match_only_text',
  'semantic_text',
  'unsupported',
]);

/** The fields that filters and KQL can target, from the columns of a dataset, as field specs by name. */
export function buildFilterableFieldSpecs(
  columns: readonly Column[],
  timeFieldName: string | undefined
): Record<string, FieldSpec> {
  return withTimeField(makeFieldSpecs(columns), timeFieldName);
}

function makeFieldSpecs(columns: readonly Column[]): Record<string, FieldSpec> {
  return Object.fromEntries(columns.map((column) => [column.name, columnToFieldSpec(column)]));
}

function withTimeField(
  fields: Record<string, FieldSpec>,
  timeFieldName: string | undefined
): Record<string, FieldSpec> {
  if (!timeFieldName || fields[timeFieldName]) {
    return fields;
  }
  return {
    ...fields,
    [timeFieldName]: {
      name: timeFieldName,
      type: KBN_FIELD_TYPES.DATE,
      esTypes: ['date'],
      searchable: true,
      aggregatable: true,
      isComputedColumn: false,
    },
  };
}

function columnToFieldSpec(column: Column): FieldSpec {
  return {
    name: column.name,
    type: column.type,
    esTypes: column.esType ? [column.esType] : undefined,
    searchable: true,
    aggregatable: !column.esType || !NON_AGGREGATABLE_ES_TYPES.has(column.esType),
    isComputedColumn: column.source === 'esql-result',
  };
}
