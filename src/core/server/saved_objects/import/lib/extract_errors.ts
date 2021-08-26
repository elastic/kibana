/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObject } from '../../types';
import { getObjKey } from '../../service/lib';
import type { ISavedObjectTypeRegistry } from '../../saved_objects_type_registry';
import { SavedObjectsImportFailure, CreatedObject } from '../types';

export function extractErrors(
  // TODO: define saved object type
  savedObjectResults: Array<CreatedObject<unknown>>,
  savedObjectsToImport: Array<SavedObject<any>>,
  typeRegistry: ISavedObjectTypeRegistry,
  namespace?: string
) {
  const errors: SavedObjectsImportFailure[] = [];
  const originalSavedObjectsMap = new Map<string, SavedObject<{ title: string }>>();
  for (const savedObject of savedObjectsToImport) {
    originalSavedObjectsMap.set(getObjKey(savedObject, typeRegistry, namespace), savedObject);
  }
  for (const savedObject of savedObjectResults) {
    if (savedObject.error) {
      const originalSavedObject = originalSavedObjectsMap.get(
        getObjKey(savedObject, typeRegistry, namespace)
      );
      const title = originalSavedObject?.attributes?.title;
      const { destinationId } = savedObject;
      if (savedObject.error.statusCode === 409) {
        errors.push({
          id: savedObject.id,
          type: savedObject.type,
          namespaces: savedObject.namespaces,
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
        namespaces: savedObject.namespaces,
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
