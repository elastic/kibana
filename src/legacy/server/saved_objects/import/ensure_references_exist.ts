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

import { SavedObject, SavedObjectsClient } from '../service';
import { ImportError } from './types';

const ENFORCED_TYPES = ['index-pattern'];

export async function ensureReferencesExist(
  savedObjects: SavedObject[],
  savedObjectsClient: SavedObjectsClient
) {
  const errors: ImportError[] = [];

  // Extract from Elasticsearch and references the ids we know exists / will exist
  const findResponse = await savedObjectsClient.find({
    type: ENFORCED_TYPES,
    fields: ['id'],
  });
  const foundKeys = findResponse.saved_objects.map(obj => `${obj.type}:${obj.id}`);
  for (const savedObject of savedObjects) {
    if (ENFORCED_TYPES.includes(savedObject.type) && !foundKeys.includes(savedObject.id)) {
      foundKeys.push(`${savedObject.type}:${savedObject.id}`);
    }
  }

  // Filter out objects with missing references, add to error object
  const filteredObjects = savedObjects.filter(savedObject => {
    const missingReferences = [];
    for (const { type: refType, id: refId } of savedObject.references || []) {
      if (!ENFORCED_TYPES.includes(refType)) {
        continue;
      }
      if (!foundKeys.includes(`${refType}:${refId}`)) {
        missingReferences.push({ type: refType, id: refId });
      }
    }
    if (missingReferences.length) {
      errors.push({
        id: savedObject.id,
        type: savedObject.type,
        error: {
          type: 'missing_references',
          references: missingReferences,
        },
      });
    }
    return missingReferences.length === 0;
  });

  return {
    errors,
    filteredObjects,
  };
}
