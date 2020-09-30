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
import { SavedObject } from '../types';
import { SavedObjectsImportError, CreatedObject } from './types';

export function extractErrors(
  // TODO: define saved object type
  savedObjectResults: Array<CreatedObject<unknown>>,
  savedObjectsToImport: Array<SavedObject<any>>
) {
  const errors: SavedObjectsImportError[] = [];
  const originalSavedObjectsMap = new Map<string, SavedObject<{ title: string }>>();
  for (const savedObject of savedObjectsToImport) {
    originalSavedObjectsMap.set(`${savedObject.type}:${savedObject.id}`, savedObject);
  }
  for (const savedObject of savedObjectResults) {
    if (savedObject.error) {
      const originalSavedObject = originalSavedObjectsMap.get(
        `${savedObject.type}:${savedObject.id}`
      );
      const title = originalSavedObject?.attributes?.title;
      const { destinationId } = savedObject;
      if (savedObject.error.statusCode === 409) {
        errors.push({
          id: savedObject.id,
          type: savedObject.type,
          title,
          meta: { title },
          error: {
            type: 'conflict',
            ...(destinationId && { destinationId }),
          },
        });
        continue;
      }
      errors.push({
        id: savedObject.id,
        type: savedObject.type,
        title,
        meta: { title },
        error: {
          ...savedObject.error,
          type: 'unknown',
        },
      });
    }
  }
  return errors;
}
