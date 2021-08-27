/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObject } from '../../types';
import { SavedObjectsImportFailure, CreatedObject } from '../types';

export function extractErrors(
  // TODO: define saved object type
  savedObjectResults: Array<CreatedObject<unknown>>,
  savedObjectsToImport: Array<SavedObject<any>>
) {
  const errors: SavedObjectsImportFailure[] = [];
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
            ...(destinationId && { destination_id: destinationId }),
            ...(destinationId && { destinationId }), // deprecated
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
          type: 'unknown',
          message: savedObject.error.message,
          status_code: savedObject.error.statusCode,
          statusCode: savedObject.error.statusCode, // deprecated
          error: savedObject.error.error, // deprecated
          ...(savedObject.error.metadata && { metadata: savedObject.error.metadata }), // deprecated
        },
      });
    }
  }
  return errors;
}
