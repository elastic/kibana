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
import { SavedObjectsClientContract } from 'src/core/server';
import { SavedObject } from '../types';
import { SavedObjectsImportError } from './types';

export async function extractErrors(
  savedObjectResults: SavedObject[],
  savedObjectsToImport: SavedObject[],
  savedObjectsClient: SavedObjectsClientContract,
  namespace?: string
) {
  const errors: SavedObjectsImportError[] = [];
  const originalSavedObjectsMap = new Map<string, SavedObject>();
  const savedObjectsTitlesMap = new Map<string, string>();

  for (const savedObject of savedObjectsToImport) {
    originalSavedObjectsMap.set(`${savedObject.type}:${savedObject.id}`, savedObject);
  }

  const errorSavedObjects = new Array();
  for (const savedObject of savedObjectResults) {
    if (savedObject.error) {
      errorSavedObjects.push(savedObject);
    }
  }

  // return an empty array if there are no errors
  if (errorSavedObjects.length === 0) {
    return [];
  }

  const bulkGetResult = await savedObjectsClient.bulkGet(errorSavedObjects, {
    namespace,
  });

  for (const savedObject of bulkGetResult.saved_objects) {
    savedObjectsTitlesMap.set(
      `${savedObject.type}:${savedObject.id}`,
      `${savedObject.attributes.title}`
    );
  }

  for (const savedObject of savedObjectResults) {
    if (savedObject.error) {
      const originalSavedObject = originalSavedObjectsMap.get(
        `${savedObject.type}:${savedObject.id}`
      );
      const title =
        originalSavedObject &&
        originalSavedObject.attributes &&
        originalSavedObject.attributes.title;

      if (savedObject.error.statusCode === 409) {
        // pick the correct title of the saved object that conflicts
        const realTitle = savedObjectsTitlesMap.get(`${savedObject.type}:${savedObject.id}`);
        errors.push({
          id: savedObject.id,
          type: savedObject.type,
          title: realTitle,
          error: {
            type: 'conflict',
          },
        });
        continue;
      }
      errors.push({
        id: savedObject.id,
        type: savedObject.type,
        title,
        error: {
          ...savedObject.error,
          type: 'unknown',
        },
      });
    }
  }
  return errors;
}
