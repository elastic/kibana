/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ExpressionTypeDefinition } from '@kbn/expressions-plugin/common';

const name = 'es_raw_response';

export interface EsRawResponse<T = unknown> {
  type: typeof name;
  body: estypes.SearchResponse<T>;
}

// flattens elasticsearch object into table rows
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

const parseRawDocs = (hits: estypes.SearchResponse<unknown>['hits']) => {
  return hits.hits.map((hit) => hit.fields || hit._source).filter((hit) => hit);
};

const convertResult = (body: estypes.SearchResponse<unknown>) => {
  return !body.aggregations ? parseRawDocs(body.hits) : flatten(body.aggregations);
};

export type EsRawResponseExpressionTypeDefinition = ExpressionTypeDefinition<
  typeof name,
  EsRawResponse,
  EsRawResponse
>;

export const esRawResponse: EsRawResponseExpressionTypeDefinition = {
  name,
  to: {
    datatable: (context: EsRawResponse) => {
      const rows = convertResult(context.body);
      const columns = rows.length
        ? Object.keys(rows[0]).map((key) => ({
            id: key,
            name: key,
            meta: {
              type: typeof rows[0][key],
              field: key,
              params: {},
            },
          }))
        : [];

      return {
        type: 'datatable',
        meta: {
          type: 'esdsl',
          source: '*',
          statistics: {
            totalCount:
              typeof context.body.hits.total === 'number'
                ? context.body.hits.total
                : context.body.hits.total?.value,
          },
        },
        columns,
        rows,
      };
    },
  },
};
