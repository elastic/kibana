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
  savedObjectsClient?: SavedObjectsClientContract,
  sourceSpaceId?:string
) {
  const errors: SavedObjectsImportError[] = [];
  const originalSavedObjectsMap = new Map<string, SavedObject>();

  //const log = new ToolingLog({ level: 'info', writeTo: process.stdout });

  for (const savedObject of savedObjectsToImport) {
    originalSavedObjectsMap.set(`${savedObject.type}:${savedObject.id}`, savedObject);
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
        // find the correct title of the saved object that conflicts, in order to use it in the message box
        let realTitle = title;

        if (savedObjectsClient) {
          try {
            if (sourceSpaceId!==undefined) {
              var resp = await savedObjectsClient.get(savedObject.type, savedObject.id,{namespace:sourceSpaceId});
              realTitle = resp.attributes.title;
            }
            else {
              var resp = await savedObjectsClient.get(savedObject.type, savedObject.id);
              realTitle = resp.attributes.title;
            }
          } catch (e) {
            // this shouldn't go wrong, but we re-throw the exception just in case
            throw (e);
          }
        }
        
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
