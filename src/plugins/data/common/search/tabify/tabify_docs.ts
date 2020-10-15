/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { SearchResponse } from 'elasticsearch';
import _ from 'lodash';
import { IndexPattern } from '../../index_patterns/index_patterns';
import { DatatableColumn } from '../../../../expressions/common/expression_types/specs';

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
        const isArrayOfObjects = Array.isArray(val) && _.isPlainObject(_.first(val));
        if (isArrayOfObjects && !isNestedField) {
          _.each(val as object, (v) => flatten(v, key + '.'));
          continue;
        }
      } else if (flat[key] !== void 0) {
        continue;
      }

      const hasValidMapping = field?.type !== 'conflict';
      const isValue = !_.isPlainObject(val);

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
) => {
  const columns: DatatableColumn[] = [];

  const rows = esResponse.hits.hits
    .map((hit) => {
      const toConvert = params.source ? hit._source : hit.fields;
      const flat = flattenHit(toConvert, index, params.shallow);
      for (const [key, value] of Object.entries(flat)) {
        const field = index?.fields.getByName(key);
        if (!columns.find((c) => c.id === (field?.name || key))) {
          const fieldName = field?.name || key;
          const fieldType = (field?.type as any) || typeof value;
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
