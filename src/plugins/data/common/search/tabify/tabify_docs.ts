/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { SearchResponse } from 'elasticsearch';
import { isPlainObject } from 'lodash';
import { IndexPattern } from '../../index_patterns/index_patterns';
import { Datatable, DatatableColumn, DatatableColumnType } from '../../../../expressions/common';

export function flattenHit(
  hit: Record<string, any>,
  indexPattern?: IndexPattern,
  shallow: boolean = false
) {
  const flat = {} as Record<string, any>;

  function flatten(obj: Record<string, any>, keyPrefix: string = '') {
    for (const [k, val] of Object.entries(obj)) {
      const key = keyPrefix + k;

      const field = indexPattern?.fields.getByName(key);

      if (!shallow) {
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

  flatten(hit);
  return flat;
}

export interface TabifyDocsOptions {
  shallow?: boolean;
  source?: boolean;
}

export const tabifyDocs = (
  esResponse: SearchResponse<unknown>,
  index?: IndexPattern,
  params: TabifyDocsOptions = {}
): Datatable => {
  const columns: DatatableColumn[] = [];

  const rows = esResponse.hits.hits
    .map((hit) => {
      const toConvert = params.source ? hit._source : hit.fields;
      const flat = flattenHit(toConvert, index, params.shallow);
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
