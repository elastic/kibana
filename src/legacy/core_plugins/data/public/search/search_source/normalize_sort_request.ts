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

import { IIndexPattern } from '../../../../../../plugins/data/public';
import { EsQuerySortValue, SortOptions } from './types';

export function normalizeSortRequest(
  sortObject: EsQuerySortValue | EsQuerySortValue[],
  indexPattern: IIndexPattern | string | undefined,
  defaultSortOptions: SortOptions = {}
) {
  const sortArray: EsQuerySortValue[] = Array.isArray(sortObject) ? sortObject : [sortObject];
  return sortArray.map(function(sortable) {
    return normalize(sortable, indexPattern, defaultSortOptions);
  });
}

/**
 * Normalize the sort description to the more verbose format (e.g. { someField: "desc" } into
 * { someField: { "order": "desc"}}), and convert sorts on scripted fields into the proper script
 * for Elasticsearch. Mix in the default options according to the advanced settings.
 */
function normalize(
  sortable: EsQuerySortValue,
  indexPattern: IIndexPattern | string | undefined,
  defaultSortOptions: any
) {
  const [[sortField, sortOrder]] = Object.entries(sortable);
  const order = typeof sortOrder === 'object' ? sortOrder : { order: sortOrder };

  if (indexPattern && typeof indexPattern !== 'string') {
    const indexField = indexPattern.fields.find(({ name }) => name === sortField);
    if (indexField && indexField.scripted && indexField.sortable) {
      return {
        _script: {
          script: {
            source: indexField.script,
            lang: indexField.lang,
          },
          type: castSortType(indexField.type),
          ...order,
        },
      };
    }
  }

  // Don't include unmapped_type for _score field
  const { unmapped_type, ...otherSortOptions } = defaultSortOptions;
  return {
    [sortField]: { ...order, ...(sortField === '_score' ? otherSortOptions : defaultSortOptions) },
  };
}

// The ES API only supports sort scripts of type 'number' and 'string'
function castSortType(type: string) {
  if (['number', 'string'].includes(type)) {
    return 'number';
  } else if (['string', 'boolean'].includes(type)) {
    return 'string';
  }
  throw new Error(`Unsupported script sort type: ${type}`);
}
