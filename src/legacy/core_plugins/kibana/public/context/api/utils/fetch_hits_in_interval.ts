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
import { convertTimeValueToIso } from './date_conversion';
import { SearchSource } from 'ui/courier';

/**
 * Fetch the hits between `(afterTimeValue, tieBreakerValue)` and
 * `endRangeMillis` from the `searchSource` using the given `timeField` and
 * `tieBreakerField` up to a maximum of `maxCount` documents. The
 * documents are sorted by `(timeField, tieBreakerField)` using the
 * `timeSortDirection` for both fields
 *
 * The `searchSource` is assumed to have the appropriate index pattern
 * and filters set.
 * @returns {Promise<object[]>}
 */
export async function fetchHitsInInterval(
  searchSource: SearchSource,
  timeFieldName: string,
  timeFieldSortDir: 'asc' | 'desc',
  startRangeMillis: number,
  endRangeMillis: number | null,
  afterTimeValue: number | string,
  tieBreakerField: string,
  tieBreakerValue: number,
  maxCount: number,
  nanosValue: string
): Promise<Object> {
  
  const startRange = {
    [timeFieldSortDir === 'asc' ? 'gte' : 'lte']: convertTimeValueToIso(
      startRangeMillis,
      nanosValue
    ),
  };
  const endRange =
    endRangeMillis === null
      ? {}
      : {
        [timeFieldSortDir === 'asc' ? 'lte' : 'gte']: convertTimeValueToIso(
          endRangeMillis,
          nanosValue
        ),
      };

  const response = await searchSource
    .setField('size', maxCount)
    .setField('query', {
      query: {
        constant_score: {
          filter: {
            range: {
              [timeFieldName]: {
                format: 'strict_date_optional_time',
                ...startRange,
                ...endRange,
              },
            },
          },
        },
      },
      language: 'lucene',
    })
    .setField('searchAfter', [afterTimeValue, tieBreakerValue])
    .setField('sort', [
      { [timeFieldName]: timeFieldSortDir },
      { [tieBreakerField]: timeFieldSortDir },
    ])
    .setField('version', true)
    .fetch();

  return response.hits ? response.hits.hits : [];
}
