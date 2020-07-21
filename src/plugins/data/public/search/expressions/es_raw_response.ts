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
import { ExpressionTypeDefinition } from '../../../../expressions/common';

const name = 'es_raw_response';

export interface EsRawResponse<T = unknown> {
  type: typeof name;
  body: SearchResponse<T>;
}

function flatten(obj: any, keyPrefix = '') {
  let topLevelKeys: Record<string, any> = {};
  const nestedRows: any[] = [];
  const prefix = keyPrefix ? keyPrefix + '.' : '';
  Object.keys(obj).forEach((key) => {
    if (Array.isArray(obj[key])) {
      nestedRows.push(
        ...obj[key]
          .map((nestedRow: any) => flatten(nestedRow, prefix + key))
          .reduce((acc: any, object: any) => [...acc, ...object], [])
      );
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      const subRows = flatten(obj[key], prefix + key);
      if (subRows.length === 1) {
        topLevelKeys = { ...topLevelKeys, ...subRows[0] };
      } else {
        nestedRows.push(...subRows);
      }
    } else {
      topLevelKeys[prefix + key] = obj[key];
    }
  });
  if (nestedRows.length === 0) {
    return [topLevelKeys];
  } else {
    return nestedRows.map((nestedRow) => ({ ...nestedRow, ...topLevelKeys }));
  }
}

const parseRawDocs = (hits: SearchResponse<unknown>['hits']) => {
  return hits.hits.map((hit) => hit.fields).filter((hit) => hit);
};

const convertResult = (body: SearchResponse<unknown>) => {
  return body.hits.hits.length ? parseRawDocs(body.hits) : flatten(body.aggregations);
};

export const esRawResponse: ExpressionTypeDefinition<typeof name, EsRawResponse, EsRawResponse> = {
  name,
  to: {
    datatable: (context: EsRawResponse) => {
      const rows = convertResult(context.body);
      const columns = Object.keys(rows[0]).map((key) => ({
        id: key,
        name: key,
        type: typeof rows[0][key],
      }));

      return {
        type: 'datatable',
        columns,
        rows,
      };
    },
    kibana_datatable: (context: EsRawResponse) => {
      const rows = convertResult(context.body);
      const columns = Object.keys(rows[0]).map((key) => ({
        id: key,
        name: key,
        meta: {},
      }));

      return {
        type: 'datatable',
        columns,
        rows,
      };
    },
  },
};
