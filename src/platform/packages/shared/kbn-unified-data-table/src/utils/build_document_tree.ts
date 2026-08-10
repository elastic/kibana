/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/public';
import type {
  DataTableRecord,
  DataTableColumnsMeta,
  EsHitRecord,
  ShouldShowFieldInTableHandler,
} from '@kbn/discover-utils/types';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import { set } from '@kbn/safer-lodash-set';
import type { JsonValue } from '../components/json_tree_viewer/json_tree_viewer';

// ES types that ES|QL delivers as a JSON string instead of a structured value.
const ESQL_JSON_STRUCTURED_ES_TYPES = new Set([
  ES_FIELD_TYPES.AGGREGATE_METRIC_DOUBLE,
  ES_FIELD_TYPES.HISTOGRAM,
]);

// Max number of values the document will show. The rest will be truncated.
// Applies before search, so truncated values do not participate in it.
// Prevents blocking the main thread on massive documents.
export const MAX_TREE_VALUES = 3;
interface ValueBudget {
  remaining: number;
  truncated: boolean;
}

interface FormatContext {
  dataView: DataView;
  columnsMeta: DataTableColumnsMeta | undefined;
  shouldShowFieldHandler: ShouldShowFieldInTableHandler;
}

export interface NestedDocument {
  tree: JsonValue;
  truncated: boolean;
}

const documentTreeCache = new WeakMap<EsHitRecord, NestedDocument>();

/**
 * Receives flattened fields (in ES|QL or DSL format) and builds a raw nested JSON document.
 */
export const flattenedToNestedDocument = ({
  row,
  dataView,
  columnsMeta,
  shouldShowFieldHandler,
}: {
  row: DataTableRecord;
  dataView: DataView;
  columnsMeta: DataTableColumnsMeta | undefined;
  shouldShowFieldHandler: ShouldShowFieldInTableHandler;
}): NestedDocument => {
  const cached = documentTreeCache.get(row.raw);
  if (cached) return cached;

  const ctx: FormatContext = {
    dataView,
    columnsMeta,
    shouldShowFieldHandler,
  };
  const budget: ValueBudget = { remaining: MAX_TREE_VALUES, truncated: false };
  const metaFields = new Set(dataView.metaFields);
  const documentFlat: Record<string, unknown> = {};

  // Step 1. Process field values. Histograms / Nested fields / unwrapp scalar values.
  // The result is still a flat object.
  for (const fieldName of Object.keys(row.flattened)) {
    // Discard meta fields (_id, _index, etc.)
    if (metaFields.has(fieldName)) continue;

    // Discard multifields (i.e: field.keyword)
    if (!shouldShowFieldHandler(fieldName)) continue;

    // Stop once the budget is spent, leaving the remaining fields out of the document.
    if (budget.remaining <= 0) {
      budget.truncated = true;
      break;
    }

    documentFlat[fieldName] = processFieldValue(row.flattened[fieldName], fieldName, ctx, budget);
  }

  // Step 2. Unflatten the object based on the dotted-key map.
  const documentTree = unflattenKeys(documentFlat);

  const result: NestedDocument = { tree: documentTree, truncated: budget.truncated };
  documentTreeCache.set(row.raw, result);
  return result;
};

const processFieldValue = (
  rawValue: unknown,
  fieldName: string,
  ctx: FormatContext,
  budget: ValueBudget
): unknown => {
  // CASE 1: a ES|QL complex column (histogram, aggregate_metric_double) arrives as a JSON string.
  // We parse it back into an object so it can be explored.
  const structured = parseEsqlStructuredValue(rawValue, ctx.columnsMeta?.[fieldName]?.esType);
  if (structured !== undefined) {
    budget.remaining -= 1;
    return structured;
  }

  // Normalise the value, in Classic we get every value wrapped in an array, in ES|QL we get the value directly.
  const values: unknown[] = Array.isArray(rawValue) ? rawValue : [rawValue];

  // CASE 2: a `nested` field. We need to recurse into the sub-objects.
  // The container may be absent from the data view (`!field`). ES|QL do not support them.
  const field = ctx.dataView.fields.getByName(fieldName);
  const isNestedContainer = !field || field.type === 'nested';
  const objects = values.filter(isPlainObject);
  if (isNestedContainer && objects.length > 0 && objects.length === values.length) {
    const nested: Array<Record<string, unknown>> = [];
    for (const object of objects) {
      // Stop before a new sub-object once the budget is spent.
      if (budget.remaining <= 0) {
        budget.truncated = true;
        break;
      }
      const inner: Record<string, unknown> = {};
      for (const key of Object.keys(object)) {
        const qualifiedName = `${fieldName}.${key}`;
        if (!ctx.shouldShowFieldHandler(qualifiedName)) continue;
        // Stop before a new sub-field once the budget is spent; the recursion accounts for its value.
        if (budget.remaining <= 0) {
          budget.truncated = true;
          break;
        }
        inner[key] = processFieldValue(object[key], qualifiedName, ctx, budget);
      }
      nested.push(unflattenKeys(inner));
    }
    return nested;
  }

  // CASE 3: a scalar value (or a genuine multi-value array). Each element is one value, so a single
  // huge field is sliced down to the remaining budget rather than materialised in full.
  const take = Math.min(values.length, budget.remaining);
  if (take < values.length) budget.truncated = true;
  budget.remaining -= take;
  const leaves = values.slice(0, take).map((value) => value ?? null);
  return leaves.length === 1 ? leaves[0] : leaves;
};

// Decode a complex ES|QL column that arrived as a JSON string back into its object/array value.
const parseEsqlStructuredValue = (value: unknown, esType: string | undefined): unknown => {
  if (
    typeof value !== 'string' ||
    !esType ||
    !ESQL_JSON_STRUCTURED_ES_TYPES.has(esType as ES_FIELD_TYPES)
  ) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(value);
    return isPlainObject(parsed) || Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
};

// Build the nested document from the flat, dotted-key map.
const unflattenKeys = (source: Record<string, unknown>): Record<string, unknown> => {
  const target: Record<string, unknown> = {};
  for (const key of Object.keys(source)) {
    set(target, key, source[key]);
  }
  return target;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
