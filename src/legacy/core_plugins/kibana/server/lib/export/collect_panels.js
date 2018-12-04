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

import { get } from 'lodash';

import { collectIndexPatterns } from './collect_index_patterns';
import { collectSearchSources } from './collect_search_sources';


export async function collectPanels(savedObjectsClient, dashboard) {
  let panels;
  try {
    panels = JSON.parse(get(dashboard, 'attributes.panelsJSON', '[]'));
  } catch(err) {
    panels = [];
  }

  if (panels.length === 0) return [].concat([dashboard]);

  const { saved_objects: savedObjects } = await savedObjectsClient.bulkGet(panels);
  const [ indexPatterns, searchSources ] = await Promise.all([
    collectIndexPatterns(savedObjectsClient, savedObjects),
    collectSearchSources(savedObjectsClient, savedObjects)
  ]);

  return savedObjects.concat(indexPatterns).concat(searchSources).concat([dashboard]);
}
