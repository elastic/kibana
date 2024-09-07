/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { isPlainObject } from 'lodash';
import {
  Datatable,
  DatatableColumn,
  DatatableRow,
  DatatableColumnType,
} from '@kbn/expressions-plugin/common';
import type { DataView } from '@kbn/data-views-plugin/common';

// meta fields we won't merge with our result hit
const EXCLUDED_META_FIELDS: string[] = ['_type', '_source'];

interface TabifyDocsOptions {
  shallow?: boolean;
  /**
   * If set to `false` the _source of the document, if requested, won't be
   * merged into the flattened document.
   */
  source?: boolean;
  /**
   * If set to `true` values that have been ignored in ES (ignored_field_values)
   * will be merged into the flattened document. This will only have an effect if
   * the `hit` has been retrieved using the `fields` option.
   */
  includeIgnoredValues?: boolean;
}

// This is an overwrite of the SearchHit type to add the ignored_field_values.
// Can be removed once the estypes.SearchHit knows about ignored_field_values
type Hit<T = unknown> = Partial<estypes.SearchHit<T>> & {
  ignored_field_values?: Record<string, unknown[]>;
};

function flattenAccum(
  flat: Record<string, any>,
  obj: Record<string, any>,
  keyPrefix: string,
  indexPattern?: DataView,
  params?: TabifyDocsOptions
) {
  for (const k in obj) {
    if (!Object.hasOwn(obj, k)) {
      continue;
    }
    const val = obj[k];

    const key = keyPrefix + k;
    const field = indexPattern?.fields.getByName(key);

    if (params?.shallow === false) {
      const isNestedField = field?.type === 'nested';
      if (Array.isArray(val) && !isNestedField) {
        for (let i = 0; i < val.length; i++) {
          const v = val[i];
          if (isPlainObject(v)) {
            flattenAccum(flat, v, key + '.', indexPattern, params);
          }
        }
        continue;
      }
    } else if (flat[key] !== undefined) {
      continue;
    }

    const hasValidMapping = field && field.type !== 'conflict';
    const isValue = !isPlainObject(val);

    if (hasValidMapping || isValue) {
      if (!flat[key]) {
        flat[key] = val;
      } else if (Array.isArray(flat[key])) {
        flat[key].push(val);
      } else {
        flat[key] = [flat[key], val];
      }
      continue;
    }

    flattenAccum(flat, val, key + '.', indexPattern, params);
  }
}

/**
 * Flattens an individual hit (from an ES response) into an object. This will
 * create flattened field names, like `user.name`.
 *
 * @param hit The hit from an ES reponse's hits.hits[]
 * @param indexPattern The index pattern for the requested index if available.
 * @param params Parameters how to flatten the hit
 */
export function flattenHit(hit: Hit, indexPattern?: DataView, params?: TabifyDocsOptions) {
  const flat = {} as Record<string, any>;

  flattenAccum(flat, hit.fields || {}, '', indexPattern, params);

  if (params?.source !== false && hit._source) {
    flattenAccum(flat, hit._source as Record<string, any>, '', indexPattern, params);
  } else if (params?.includeIgnoredValues && hit.ignored_field_values) {
    // If enabled merge the ignored_field_values into the flattened hit. This will
    // merge values that are not actually indexed by ES (i.e. ignored), e.g. because
    // they were above the `ignore_above` limit or malformed for specific types.
    // This API will only contain the values that were actually ignored, i.e. for the same
    // field there might exist another value in the `fields` response, why this logic
    // merged them both together. We do not merge this (even if enabled) in case source has been
    // merged, since we would otherwise duplicate values, since ignore_field_values and _source
    // contain the same values.
    for (const fieldName in hit.ignored_field_values) {
      if (!Object.hasOwn(hit.ignored_field_values, fieldName)) {
        continue;
      }
      const fieldValue = hit.ignored_field_values[fieldName];
      if (flat[fieldName]) {
        // If there was already a value from the fields API, make sure we're merging both together
        if (Array.isArray(flat[fieldName])) {
          flat[fieldName] = [...flat[fieldName], ...fieldValue];
        } else {
          flat[fieldName] = [flat[fieldName], ...fieldValue];
        }
      } else {
        // If no previous value was assigned we can simply use the value from `ignored_field_values` as it is
        flat[fieldName] = fieldValue;
      }
    }
  }

  // Merge all valid meta fields into the flattened object
  if (indexPattern?.metaFields) {
    for (let i = 0; i < indexPattern?.metaFields.length; i++) {
      const fieldName = indexPattern?.metaFields[i];
      const isExcludedMetaField =
        EXCLUDED_META_FIELDS.includes(fieldName) || fieldName.charAt(0) !== '_';
      if (!isExcludedMetaField) {
        flat[fieldName] = hit[fieldName as keyof Hit];
      }
    }
  }

  // Use a proxy to make sure that keys are always returned in a specific order,
  // so we have a guarantee on the flattened order of keys.
  return makeProxy(flat, indexPattern);
}

function makeProxy(flat: Record<string, any>, indexPattern?: DataView) {
  const metaFields = new Set(indexPattern?.metaFields);

  function comparator(a: string | symbol, b: string | symbol) {
    if (typeof a === 'symbol' || typeof b === 'symbol') {
      return 0;
    }
    const aIsMeta = metaFields.has(a);
    const bIsMeta = metaFields.has(b);
    if (aIsMeta && bIsMeta) {
      return a < b ? -1 : a > b ? 1 : 0;
    }
    if (aIsMeta) {
      return 1;
    }
    if (bIsMeta) {
      return -1;
    }
    return a < b ? -1 : a > b ? 1 : 0;
  }

  let cachedKeys: Array<string | symbol> | undefined;

  return new Proxy(flat, {
    defineProperty: (...args) => {
      cachedKeys = undefined;
      return Reflect.defineProperty(...args);
    },
    deleteProperty: (...args) => {
      cachedKeys = undefined;
      return Reflect.deleteProperty(...args);
    },
    ownKeys: (target) => {
      if (!cachedKeys) {
        cachedKeys = Reflect.ownKeys(target).sort(comparator);
      }
      return cachedKeys;
    },
  });
}

export const tabifyDocs = (
  esResponse: estypes.SearchResponse<unknown>,
  index?: DataView,
  params: TabifyDocsOptions = {}
): Datatable => {
  const columns: DatatableColumn[] = [];

  const rows: Array<DatatableRow | undefined> = esResponse.hits.hits
    .map((hit) => {
      const flat = flattenHit(hit, index, params);
      if (!flat) {
        return;
      }
      for (const [key, value] of Object.entries(flat)) {
        const field = index?.fields.getByName(key);
        const fieldName = field?.name || key;
        if (!columns.find((c) => c.id === fieldName)) {
          const fieldType = (field?.type as DatatableColumnType) || typeof value;
          const formatter = field && index?.getFormatterForField(field);
          columns.push({
            id: fieldName,
            name: fieldName,
            meta: {
              type: fieldType,
              field: fieldName,
              index: index?.id,
              params: formatter ? formatter.toJSON() : undefined,
            },
          });
        }
      }
      return flat;
    })
    .filter((hit) => hit);

  return {
    type: 'datatable',
    columns,
    rows: rows as DatatableRow[],
  };
};
