/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { estypes } from '@elastic/elasticsearch';
import { isPlainObject } from 'lodash';
import { IndexPattern } from '../..';
import { Datatable, DatatableColumn, DatatableColumnType } from '../../../../expressions/common';

export interface TabifyDocsOptions {
  shallow?: boolean;
  source?: boolean;
  meta?: boolean;
}

export function flattenHit(
  hit: estypes.SearchHit,
  indexPattern?: IndexPattern,
  params?: TabifyDocsOptions
) {
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
  }
  if (params?.meta !== false) {
    // combine the fields that Discover allows to add as columns
    const { _id, _index, _type, _score } = hit;
    flatten({ _id, _index, _score, _type });
  }

  return flat;
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
