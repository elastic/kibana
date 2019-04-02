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

/*
 * This file provides logic for migrating raw documents.
 */

import { RawDoc, SavedObjectsSerializer } from '../../serialization';
import { TransformFn } from './document_migrator';

/**
 * Applies the specified migration function to every saved object document in the list
 * of raw docs. Any raw docs that are not valid saved objects will simply be passed through.
 *
 * @param {TransformFn} migrateDoc
 * @param {RawDoc[]} rawDocs
 * @returns {RawDoc[]}
 */
export function migrateRawDocs(
  serializer: SavedObjectsSerializer,
  migrateDoc: TransformFn,
  rawDocs: RawDoc[]
): RawDoc[] {
  return rawDocs.map(raw => {
    if (serializer.isRawSavedObject(raw)) {
      const savedObject = serializer.rawToSavedObject(raw);
      savedObject.migrationVersion = savedObject.migrationVersion || {};
      return serializer.savedObjectToRaw({
        references: [],
        ...migrateDoc(savedObject),
      });
    }

    return raw;
  });
}
