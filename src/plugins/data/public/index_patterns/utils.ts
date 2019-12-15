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

import { find } from 'lodash';
import { SavedObjectsClientContract, SimpleSavedObject } from 'src/core/public';

/**
 * Returns an object matching a given title
 *
 * @param client {SavedObjectsClientContract}
 * @param title {string}
 * @returns {Promise<SimpleSavedObject|undefined>}
 */
export async function findByTitle(
  client: SavedObjectsClientContract,
  title: string
): Promise<SimpleSavedObject<any> | void> {
  if (!title) {
    return Promise.resolve();
  }

  const { savedObjects } = await client.find({
    type: 'index-pattern',
    perPage: 10,
    search: `"${title}"`,
    searchFields: ['title'],
    fields: ['title'],
  });

  return find(
    savedObjects,
    (obj: SimpleSavedObject<any>) => obj.get('title').toLowerCase() === title.toLowerCase()
  );
}

export function getRoutes() {
  return {
    edit: '/management/kibana/index_patterns/{{id}}',
    addField: '/management/kibana/index_patterns/{{id}}/create-field',
    indexedFields: '/management/kibana/index_patterns/{{id}}?_a=(tab:indexedFields)',
    scriptedFields: '/management/kibana/index_patterns/{{id}}?_a=(tab:scriptedFields)',
    sourceFilters: '/management/kibana/index_patterns/{{id}}?_a=(tab:sourceFilters)',
  };
}
