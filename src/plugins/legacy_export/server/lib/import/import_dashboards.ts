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

import { SavedObject, SavedObjectsClientContract } from 'src/core/server';

export async function importDashboards(
  savedObjectsClient: SavedObjectsClientContract,
  objects: SavedObject[],
  { overwrite, exclude }: { overwrite: boolean; exclude: string[] }
) {
  // The server assumes that documents with no migrationVersion are up to date.
  // That assumption enables Kibana and other API consumers to not have to build
  // up migrationVersion prior to creating new objects. But it means that imports
  // need to set migrationVersion to something other than undefined, so that imported
  // docs are not seen as automatically up-to-date.
  const docs = objects
    .filter((item) => !exclude.includes(item.type))
    .map((doc) => ({ ...doc, migrationVersion: doc.migrationVersion || {} }));

  const results = await savedObjectsClient.bulkCreate(docs, { overwrite });
  return { objects: results.saved_objects };
}
