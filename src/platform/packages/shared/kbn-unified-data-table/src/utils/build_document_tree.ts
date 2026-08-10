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

interface FormatContext {
  dataView: DataView;
  columnsMeta: DataTableColumnsMeta | undefined;
  shouldShowFieldHandler: ShouldShowFieldInTableHandler;
}

const documentTreeCache = new WeakMap<EsHitRecord, JsonValue>();

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
}): JsonValue => {
  const cached = documentTreeCache.get(row.raw);
  if (cached) return cached;

  const ctx: FormatContext = {
    dataView,
    columnsMeta,
    shouldShowFieldHandler,
  };
  const metaFields = new Set(dataView.metaFields);
  const documentFlat: Record<string, unknown> = {};

  // Step 1. Process field values. Histograms / Nested fields / unwrapp scalar values.
  // The result is still a flat object.
  for (const fieldName of Object.keys(row.flattened)) {
    // Discard meta fields (_id, _index, etc.)
    if (metaFields.has(fieldName)) continue;
    // Discard multifields (i.e: field.keyword)
    if (!shouldShowFieldHandler(fieldName)) continue;

    documentFlat[fieldName] = processFieldValue(row.flattened[fieldName], fieldName, ctx);
  }

  // Step 2. Unflatten the object based on the dotted-key map.
  const documentTree = unflattenKeys(documentFlat);

  documentTreeCache.set(row.raw, documentTree);
  return documentTree;
};

const processFieldValue = (rawValue: unknown, fieldName: string, ctx: FormatContext): unknown => {
  // CASE 1: a ES|QL complex column (histogram, aggregate_metric_double) arrives as a JSON string.
  // We parse it back into an object so it can be explored.
  const structured = parseEsqlStructuredValue(rawValue, ctx.columnsMeta?.[fieldName]?.esType);
  if (structured !== undefined) return structured;

  // Normalise the value, in Classic we get every value wrapped in an array, in ES|QL we get the value directly.
  const values: unknown[] = Array.isArray(rawValue) ? rawValue : [rawValue];

  // CASE 2: a `nested` field. We need to recurse into the sub-objects.
  // The container may be absent from the data view (`!field`). ES|QL do not support them.
  const field = ctx.dataView.fields.getByName(fieldName);
  const isNestedContainer = !field || field.type === 'nested';
  const objects = values.filter(isPlainObject);
  if (isNestedContainer && objects.length > 0 && objects.length === values.length) {
    return objects.map((object) => {
      const inner: Record<string, unknown> = {};
      for (const key of Object.keys(object)) {
        const qualifiedName = `${fieldName}.${key}`;
        if (!ctx.shouldShowFieldHandler(qualifiedName)) continue;
        inner[key] = processFieldValue(object[key], qualifiedName, ctx);
      }
      return unflattenKeys(inner);
    });
  }

  // CASE 3: a scalar value. We unwrap the array and return the value.
  const leaves = values.map((value) => value ?? null);
  return leaves.length === 1 ? leaves[0] : leaves;
};

// Decode a complex ES|QL column that arrived as a JSON string back into its object/array value.
const parseEsqlStructuredValue = (value: unknown, esType: string | undefined): unknown => {
  if (typeof value !== 'string' || !esType || !ESQL_JSON_STRUCTURED_ES_TYPES.has(esType)) {
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
