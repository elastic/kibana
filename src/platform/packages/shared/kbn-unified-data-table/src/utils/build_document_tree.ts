/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { getDataViewFieldOrCreateFromColumnMeta } from '@kbn/data-view-utils';
import { formatFieldStringValueWithHighlights } from '@kbn/discover-utils';
import type { DataTableRecord, DataTableColumnsMeta, EsHitRecord } from '@kbn/discover-utils/types';
import { set } from '@kbn/safer-lodash-set';
import type { JsonValue } from '../components/json_tree_viewer/json_tree_viewer';

// Discover's grid fetch uses the fields API with `_source: false`, so a cell only ever gets
// `row.flattened`: a flat map of dotted keys whose values are (single-element) arrays. To render
// it as a document tree we un-flatten it back to a nested object and unwrap single-value arrays
// into scalars. Values are kept RAW (no field formatters) — the only transform applied is search
// highlighting, so a query's matched terms are marked; those leaves become React nodes.
//
// A `nested`-mapped field is the exception to the flat shape: Elasticsearch returns it correlated
// as an array-of-objects under a single key, so we recurse into it to keep the array-of-objects
// intact. A plain `object`-mapped array (e.g. ecommerce `products`) is decorrelated by ES into
// parallel dotted keys with no correlation metadata, so it un-flattens to an honest
// object-of-arrays.
//
// ES|QL mode differs: `row.flattened` is the query's columnar row (values are not array-wrapped),
// and a few complex types (`histogram`, `aggregate_metric_double`) arrive as a JSON-encoded string
// rather than the object the fields API returns. Those are decoded back to structure — keyed on
// the column's ES type — so the tree matches Classic mode; everything else flows through the same
// un-flatten.

interface FormatContext {
  dataView: DataView;
  fieldFormats: FieldFormatsStart;
  columnsMeta: DataTableColumnsMeta | undefined;
  hit: EsHitRecord;
}

const documentTreeCache = new WeakMap<EsHitRecord, JsonValue>();

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// ES types that ES|QL delivers as a JSON-encoded string instead of a structured value.
const ESQL_JSON_STRUCTURED_ES_TYPES = new Set(['aggregate_metric_double', 'histogram']);

// Decode a complex ES|QL column that arrived as a JSON string back into its object/array value.
// Gated on the column's ES type so a genuine keyword string that merely looks like JSON is never
// touched; returns `undefined` when there is nothing to decode, so the caller keeps the raw value.
const parseEsqlStructuredValue = (value: unknown, esType: string | undefined): unknown => {
  if (typeof value !== 'string' || !esType || !ESQL_JSON_STRUCTURED_ES_TYPES.has(esType)) {
    return undefined;
  }
  try {
    const parsed: unknown = JSON.parse(value);
    return isPlainObject(parsed) || Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
};

// Rebuild the nested document from the flat, dotted-key map. Unlike a deep un-flatten, this only
// de-dots the keys and treats each value as opaque — the values are already fully processed, and
// crucially a highlighted value is a React element whose (possibly cyclic) internals must never
// be recursed into.
const unflattenKeys = (source: Record<string, unknown>): Record<string, unknown> => {
  const target: Record<string, unknown> = {};
  for (const key of Object.keys(source)) {
    set(target, key, source[key]);
  }
  return target;
};

// Keep the raw stored value, except when ES highlighted the field for the active query — then
// render the value with the matched terms marked (a React node).
const toLeaf = (
  value: unknown,
  fieldName: string,
  highlighted: boolean,
  ctx: FormatContext
): unknown => {
  if (value === null || value === undefined) return null;
  if (highlighted) {
    return formatFieldStringValueWithHighlights({
      value,
      hit: ctx.hit,
      fieldFormats: ctx.fieldFormats,
      dataView: ctx.dataView,
      fieldName,
    });
  }
  return value;
};

const processFieldValue = (rawValue: unknown, fieldName: string, ctx: FormatContext): unknown => {
  // An ES|QL complex column (histogram, aggregate_metric_double) delivered as a JSON string: hand
  // the decoded structure straight to the tree — its inner values are already concrete.
  const structured = parseEsqlStructuredValue(rawValue, ctx.columnsMeta?.[fieldName]?.esType);
  if (structured !== undefined) return structured;

  const values: unknown[] = Array.isArray(rawValue) ? rawValue : [rawValue];
  const field = getDataViewFieldOrCreateFromColumnMeta({
    dataView: ctx.dataView,
    fieldName,
    columnMeta: ctx.columnsMeta?.[fieldName],
  });

  // Nested field: ES returns it as a correlated array of plain objects under a single key.
  // Recurse into each object (de-dotting inner keys) and keep it an array, since a nested field
  // is array-valued by nature. The container is either absent from the data view (`!field`) or
  // present as a `nested`-typed field; a mapped object value (e.g. geo_point) is left raw.
  const isNestedContainer = !field || field.type === 'nested';
  const objects = values.filter(isPlainObject);
  if (isNestedContainer && objects.length > 0 && objects.length === values.length) {
    return objects.map((object) => {
      const inner: Record<string, unknown> = {};
      for (const key of Object.keys(object)) {
        inner[key] = processFieldValue(object[key], `${fieldName}.${key}`, ctx);
      }
      return unflattenKeys(inner);
    });
  }

  // The fields API wraps every value in an array; a single value reads better as a scalar,
  // while a genuine multi-value field stays an array.
  const highlighted = Boolean(ctx.hit.highlight?.[fieldName]);
  const leaves = values.map((value) => toLeaf(value, fieldName, highlighted, ctx));
  return leaves.length === 1 ? leaves[0] : leaves;
};

export const buildDocumentTree = ({
  row,
  dataView,
  fieldFormats,
  columnsMeta,
}: {
  row: DataTableRecord;
  dataView: DataView;
  fieldFormats: FieldFormatsStart;
  columnsMeta: DataTableColumnsMeta | undefined;
}): JsonValue => {
  const cached = documentTreeCache.get(row.raw);
  if (cached) return cached;

  const ctx: FormatContext = { dataView, fieldFormats, columnsMeta, hit: row.raw };
  const metaFields = new Set(dataView.metaFields);
  const documentFlat: Record<string, unknown> = {};

  for (const fieldName of Object.keys(row.flattened)) {
    if (metaFields.has(fieldName)) continue;
    documentFlat[fieldName] = processFieldValue(row.flattened[fieldName], fieldName, ctx);
  }

  const documentTree = unflattenKeys(documentFlat);
  documentTreeCache.set(row.raw, documentTree);
  return documentTree;
};
