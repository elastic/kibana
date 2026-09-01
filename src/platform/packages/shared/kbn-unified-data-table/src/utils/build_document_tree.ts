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
import type { JsonValue } from '../components/json_tree_viewer/json_tree_viewer';

// Max number of values the document will show. The rest will be truncated.
// Applies before search, so truncated values do not participate in it.
// Prevents blocking the main thread on massive documents.
export const MAX_TREE_VALUES = 10_000;

// Skip JSON.parse on field values this long or longer. The raw string is shown instead.
export const MAX_JSON_PARSE_LENGTH = 5_000;

interface ValueBudget {
  remaining: number;
  truncated: boolean;
}

interface FormatContext {
  dataView: DataView;
  shouldShowFieldHandler: ShouldShowFieldInTableHandler;
  hideNulls: boolean;
}

// Returned by processFieldValue when, with `hideNulls` on, a field has no non-null value left and
// should be dropped entirely rather than added to the document.
const OMIT_FIELD = Symbol('omitField');

const emptyObject = (): Record<string, unknown> => Object.create(null);

const setOwn = (object: Record<string, unknown>, key: string, value: unknown): void => {
  Object.defineProperty(object, key, {
    value,
    enumerable: true,
    writable: true,
    configurable: true,
  });
};

export interface NestedDocument {
  tree: JsonValue;
  truncated: boolean;
}

// Cached per raw hit and per (hideNulls, field-filter) signature, since each combination
// produces a different document.
const documentTreeCache = new WeakMap<EsHitRecord, Map<string, NestedDocument>>();

/**
 * Receives flattened fields (in ES|QL or DSL format) and builds a raw nested JSON document.
 */
export const flattenedToNestedDocument = ({
  row,
  dataView,
  shouldShowFieldHandler,
  hideNulls = false,
  selectedColumns,
}: {
  row: DataTableRecord;
  dataView: DataView;
  columnsMeta: DataTableColumnsMeta | undefined;
  shouldShowFieldHandler: ShouldShowFieldInTableHandler;
  hideNulls?: boolean;
  selectedColumns?: string[];
}): NestedDocument => {
  // The tree depends on hideNulls and the active field filter, so cache per row and per signature.
  const filterSignature = selectedColumns?.length ? [...selectedColumns].sort().join('\n') : '';
  const cacheKey = `${hideNulls ? '1' : '0'}:${filterSignature}`;
  let rowCache = documentTreeCache.get(row.raw);
  const cached = rowCache?.get(cacheKey);
  if (cached) return cached;

  const ctx: FormatContext = {
    dataView,
    shouldShowFieldHandler,
    hideNulls,
  };
  const budget: ValueBudget = { remaining: MAX_TREE_VALUES, truncated: false };
  const metaFields = new Set(dataView.metaFields);
  const documentFlat = emptyObject();

  // Step 1. Process field values. Nested fields / unwrap scalar values / expand JSON strings.
  // The result is still a flat object.
  for (const fieldName of Object.keys(row.flattened)) {
    // Discard meta fields (_id, _index, etc.)
    if (metaFields.has(fieldName)) continue;

    const isExplicitlySelected = selectedColumns?.includes(fieldName) ?? false;

    // Discard multifields (i.e: field.keyword) unless the user explicitly selected them.
    if (!isExplicitlySelected && !shouldShowFieldHandler(fieldName)) continue;

    // When the user selects columns, the JSON is filtered to those fields.
    if (selectedColumns?.length && !isFieldSelected(fieldName, selectedColumns)) continue;

    // Stop once the budget is spent, leaving the remaining fields out of the document.
    if (budget.remaining <= 0) {
      budget.truncated = true;
      break;
    }

    const value = processFieldValue(row.flattened[fieldName], fieldName, ctx, budget);
    if (value !== OMIT_FIELD) {
      setOwn(documentFlat, fieldName, value);
    }
  }

  // Step 2. Unflatten the object based on the dotted-key map.
  const documentTree = unflattenKeys(documentFlat);

  const result: NestedDocument = { tree: documentTree, truncated: budget.truncated };
  if (!rowCache) {
    rowCache = new Map<string, NestedDocument>();
    documentTreeCache.set(row.raw, rowCache);
  }
  rowCache.set(cacheKey, result);
  return result;
};

/**
 * Serializes a row to JSON exactly as the JSON tree viewer renders it.
 */
export const sourceDocumentToJsonString = (
  params: {
    row: DataTableRecord;
    dataView: DataView;
    columnsMeta: DataTableColumnsMeta | undefined;
    shouldShowFieldHandler: ShouldShowFieldInTableHandler;
    selectedColumns?: string[];
  },
  { multiline }: { multiline: boolean }
): string => {
  const { tree } = flattenedToNestedDocument(params);
  return multiline ? JSON.stringify(tree, null, 2) : JSON.stringify(tree);
};

const processFieldValue = (
  rawValue: unknown,
  fieldName: string,
  ctx: FormatContext,
  budget: ValueBudget
): unknown => {
  // Normalise the value, in Classic we get every value wrapped in an array, in ES|QL we get the value directly.
  const values: unknown[] = Array.isArray(rawValue) ? rawValue : [rawValue];

  // CASE 1: a `nested` field. We need to recurse into the sub-objects.
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
      const inner = emptyObject();
      for (const key of Object.keys(object)) {
        const qualifiedName = `${fieldName}.${key}`;
        if (!ctx.shouldShowFieldHandler(qualifiedName)) continue;
        // Stop before a new sub-field once the budget is spent; the recursion accounts for its value.
        if (budget.remaining <= 0) {
          budget.truncated = true;
          break;
        }
        const value = processFieldValue(object[key], qualifiedName, ctx, budget);
        if (value !== OMIT_FIELD) {
          setOwn(inner, key, value);
        }
      }
      nested.push(unflattenKeys(inner));
    }
    return nested;
  }

  // CASE 2: a scalar value (or a genuine multi-value array). Each element is one value, so a single
  // huge field is sliced down to the remaining budget rather than materialised in full.
  // With `hideNulls`, null entries are dropped up front so they never reach the budget;
  // a field left without any value is omitted entirely.
  const visibleValues = ctx.hideNulls ? values.filter((value) => value != null) : values;
  if (ctx.hideNulls && visibleValues.length === 0) {
    return OMIT_FIELD;
  }
  // String values that are perfect JSON (an object or array) are expanded; inner nodes count
  // against the same budget.
  const leaves: unknown[] = [];
  for (const value of visibleValues) {
    if (budget.remaining <= 0) {
      budget.truncated = true;
      break;
    }

    const parsedJson = tryParsePerfectJson(value, budget);
    if (parsedJson !== undefined) {
      leaves.push(parsedJson);
      continue;
    }

    budget.remaining -= 1;
    leaves.push(value ?? null);
  }
  return leaves.length === 1 ? leaves[0] : leaves;
};

// Parse a string that is entirely a JSON object or array. Length / delimiter checks
// run first so JSON.parse is not attempted on large or obviously non-JSON values.
// The reviver counts inner nodes against the document budget (not a precise trim).
const tryParsePerfectJson = (value: unknown, budget: ValueBudget): unknown => {
  if (typeof value !== 'string' || value.length >= MAX_JSON_PARSE_LENGTH) {
    return undefined;
  }
  const first = value.trimStart()[0];
  if (first !== '{' && first !== '[') {
    return undefined;
  }

  const remainingBefore = budget.remaining;
  const truncatedBefore = budget.truncated;
  try {
    return JSON.parse(value, (_key, nested) => {
      budget.remaining -= 1;
      if (budget.remaining < 0) budget.truncated = true;
      return nested;
    });
  } catch {
    // A failed parse must not spend budget.
  }
  budget.remaining = remainingBefore;
  budget.truncated = truncatedBefore;
  return undefined;
};

// Build the nested document from the flat, dotted-key map. Parents are applied
// first so a scalar (`aws.s3.bucket.name`) is not overwritten by a child key
// (`aws.s3.bucket.name.keyword`). Not using lodash `set` because it would otherwise build an array for `latency.50` key.
// Using `emptyObject` and `setOwn` to avoid protoptype pollution.
const unflattenKeys = (source: Record<string, unknown>): Record<string, unknown> => {
  const target = emptyObject();
  const keys = Object.keys(source).sort(
    (left, right) => left.split('.').length - right.split('.').length
  );
  for (const key of keys) {
    setNested(target, key.split('.'), source[key]);
  }
  return target;
};

const setNested = (target: Record<string, unknown>, path: string[], value: unknown): void => {
  let current = target;
  for (let i = 0; i < path.length - 1; i++) {
    const segment = path[i];
    const existing = Object.hasOwn(current, segment) ? current[segment] : undefined;
    if (isPlainObject(existing)) {
      current = existing;
      continue;
    }
    if (existing === undefined) {
      const next = emptyObject();
      setOwn(current, segment, next);
      current = next;
      continue;
    }
    // A scalar already occupies this path (parent field + multi-field). Keep the
    // scalar and store the remainder as a dotted key so both values stay visible.
    setOwn(current, path.slice(i).join('.'), value);
    return;
  }
  setOwn(current, path[path.length - 1], value);
};

// A flattened field is kept when it is a selected column, or a descendant of a selected object
// parent (which keeps its `.*` children).
const isFieldSelected = (fieldName: string, selectedColumns: string[]): boolean =>
  selectedColumns.some((column) => fieldName === column || fieldName.startsWith(`${column}.`));

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
