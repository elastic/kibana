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

import { keys, find, get } from 'lodash';
import { Filter, isRangeFilter } from '@kbn/es-query';
import { IndexPatterns } from '../../../index_patterns';

export async function extractTimeFilter(indexPatterns: IndexPatterns, filters: Filter[]) {
  // Assume all the index patterns are the same since they will be added
  // from the same visualization.
  const id: string = get(filters, '[0].meta.index');
  if (id == null) return;

  const indexPattern = await indexPatterns.get(id);

  return find(filters, (obj: Filter) => {
    let key;

    if (isRangeFilter(obj)) {
      key = keys(obj.range)[0];
    }

    return Boolean(key && key === indexPattern.timeFieldName);
  });
}
