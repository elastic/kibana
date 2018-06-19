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

import { fetchOrDefault } from './fetch_or_default';
import { CallCluster, IndexMapping } from './types';

/**
 * fetchMapping retrieves the mappings for the specified index,
 * returning null if the mappings are not found.
 * @param {CallCluster} callCluster - The elasticsearch.js function
 * @param {string} index - The name of the index whose mappings are being retrieved
 * @returns {Promise<IndexMapping | null>}
 */
export async function fetchMapping(
  callCluster: CallCluster,
  index: string
): Promise<IndexMapping | null> {
  const result = await fetchOrDefault(
    callCluster('indices.getMapping', { index }),
    null
  );
  if (!result) {
    return null;
  }
  return Object.values(result)[0].mappings || null;
}
