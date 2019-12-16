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

import { get, sortBy } from 'lodash';

export async function getIndices(es, indexPatternCreationType, rawPattern, limit) {
  const pattern = rawPattern.trim();

  // Searching for `*:` fails for CCS environments. The search request
  // is worthless anyways as the we should only send a request
  // for a specific query (where we do not append *) if there is at
  // least a single character being searched for.
  if (pattern === '*:') {
    return [];
  }

  // This should never match anything so do not bother
  if (pattern === '') {
    return [];
  }

  // ES does not like just a `,*` and will throw a `[string_index_out_of_bounds_exception] String index out of range: 0`
  if (pattern.startsWith(',')) {
    return [];
  }

  // We need to always provide a limit and not rely on the default
  if (!limit) {
    throw new Error('`getIndices()` was called without the required `limit` parameter.');
  }

  const params = {
    ignoreUnavailable: true,
    index: pattern,
    ignore: [404],
    body: {
      size: 0, // no hits
      aggs: {
        indices: {
          terms: {
            field: '_index',
            size: limit,
          },
        },
      },
    },
  };

  try {
    const response = await es.search(params);
    if (!response || response.error || !response.aggregations) {
      return [];
    }

    return sortBy(
      response.aggregations.indices.buckets
        .map(bucket => {
          return bucket.key;
        })
        .map(indexName => {
          return {
            name: indexName,
            tags: indexPatternCreationType.getIndexTags(indexName),
          };
        }),
      'name'
    );
  } catch (err) {
    const type = get(err, 'body.error.caused_by.type');
    if (type === 'index_not_found_exception') {
      // This happens in a CSS environment when the controlling node returns a 500 even though the data
      // nodes returned a 404. Remove this when/if this is handled: https://github.com/elastic/elasticsearch/issues/27461
      return [];
    }
    throw err;
  }
}
