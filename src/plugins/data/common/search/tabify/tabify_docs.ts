/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { isPlainObject } from 'lodash';
import { IndexPattern } from '../..';
import { Datatable, DatatableColumn, DatatableColumnType } from '../../../../expressions/common';

type ValidMetaFieldNames = keyof Pick<
  estypes.SearchHit,
  | '_id'
  | '_ignored'
  | '_index'
  | '_node'
  | '_primary_term'
  | '_routing'
  | '_score'
  | '_seq_no'
  | '_shard'
  | '_source'
  | '_version'
>;
const VALID_META_FIELD_NAMES: ValidMetaFieldNames[] = [
  '_id',
  '_ignored',
  '_index',
  '_node',
  '_primary_term',
  '_routing',
  '_score',
  '_seq_no',
  '_shard',
  '_source',
  '_version',
];

function isValidMetaFieldName(field: string): field is ValidMetaFieldNames {
  // Since the array above is more narrowly typed than string[], we cannot use
  // string to find a value in here. We manually cast it to wider string[] type
  // so we're able to use `includes` on it.
  return (VALID_META_FIELD_NAMES as string[]).includes(field);
}

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
type Hit<T = unknown> = estypes.SearchHit<T> & { ignored_field_values?: Record<string, unknown[]> };

/**
 * Flattens an individual hit (from an ES response) into an object. This will
 * create flattened field names, like `user.name`.
 *
 * @param hit The hit from an ES reponse's hits.hits[]
 * @param indexPattern The index pattern for the requested index if available.
 * @param params Parameters how to flatten the hit
 */
export function flattenHit(hit: Hit, indexPattern?: IndexPattern, params?: TabifyDocsOptions) {
  const flat = {} as Record<string, any>;

  function flatten(obj: Record<string, any>, keyPrefix: string = '') {
    for (const [k, val] of Object.entries(obj)) {
      const key = keyPrefix + k;

      const field = indexPattern?.fields.getByName(key);

      if (params?.shallow === false) {
        const isNestedField = field?.type === 'nested';
        if (Array.isArray(val) && !isNestedField) {
          val.forEach((v) => isPlainObject(v) && flatten(v, key + '.'));
          continue;
        }
      } else if (flat[key] !== undefined) {
        continue;
      }

      const hasValidMapping = field?.type !== 'conflict';
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

      flatten(val, key + '.');
    }
  }

  flatten(hit.fields || {});
  if (params?.source !== false && hit._source) {
    flatten(hit._source as Record<string, any>);
  } else if (params?.includeIgnoredValues && hit.ignored_field_values) {
    // If enabled merge the ignored_field_values into the flattened hit. This will
    // merge values that are not actually indexed by ES (i.e. ignored), e.g. because
    // they were above the `ignore_above` limit or malformed for specific types.
    // This API will only contain the values that were actually ignored, i.e. for the same
    // field there might exist another value in the `fields` response, why this logic
    // merged them both together. We do not merge this (even if enabled) in case source has been
    // merged, since we would otherwise duplicate values, since ignore_field_values and _source
    // contain the same values.
    Object.entries(hit.ignored_field_values).forEach(([fieldName, fieldValue]) => {
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
    });
  }

  // Merge all valid meta fields into the flattened object
  // expect for _source (in case that was specified as a meta field)
  indexPattern?.metaFields?.forEach((metaFieldName) => {
    if (!isValidMetaFieldName(metaFieldName) || metaFieldName === '_source') {
      return;
    }
    flat[metaFieldName] = hit[metaFieldName];
  });

  // Use a proxy to make sure that keys are always returned in a specific order,
  // so we have a guarantee on the flattened order of keys.
  return new Proxy(flat, {
    ownKeys: (target) => {
      return Reflect.ownKeys(target).sort((a, b) => {
        const aIsMeta = indexPattern?.metaFields?.includes(String(a));
        const bIsMeta = indexPattern?.metaFields?.includes(String(b));
        if (aIsMeta && bIsMeta) {
          return String(a).localeCompare(String(b));
        }
        if (aIsMeta) {
          return 1;
        }
        if (bIsMeta) {
          return -1;
        }
        return String(a).localeCompare(String(b));
      });
    },
  });
}

export const tabifyDocs = (
  esResponse: estypes.SearchResponse<unknown>,
  index?: IndexPattern,
  params: TabifyDocsOptions = {}
): Datatable => {
  const columns: DatatableColumn[] = [];

  const rows = esResponse.hits.hits
    .map((hit) => {
      const flat = flattenHit(hit, index, params);
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
    rows,
  };
};
