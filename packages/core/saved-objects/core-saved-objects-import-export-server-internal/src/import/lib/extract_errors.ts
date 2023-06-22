/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectsImportFailure } from '@kbn/core-saved-objects-common';
import type { CreatedObject, SavedObject } from '@kbn/core-saved-objects-server';
import type { LegacyUrlAlias } from '@kbn/core-saved-objects-base-server-internal';

export function extractErrors(
  // TODO: define saved object type
  savedObjectResults: Array<CreatedObject<unknown>>,
  savedObjectsToImport: Array<SavedObject<any>>,
  legacyUrlAliasResults: SavedObject[],
  legacyUrlAliasesToCreate: Map<string, SavedObject<LegacyUrlAlias>>
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
          meta: { title },
          error: {
            type: 'conflict',
            ...(destinationId && { destinationId }),
          },
          managed: savedObject.managed,
        });
        continue;
      }
      errors.push({
        id: savedObject.id,
        type: savedObject.type,
        meta: { title },
        error: {
          ...savedObject.error,
          type: 'unknown',
        },
        managed: savedObject.managed,
      });
    }
  }

  for (const legacyUrlAliasResult of legacyUrlAliasResults) {
    if (!legacyUrlAliasResult.error) {
      continue;
    }

    const legacyUrlAlias = legacyUrlAliasesToCreate.get(legacyUrlAliasResult.id);
    if (legacyUrlAlias) {
      errors.push({
        id: legacyUrlAlias.id,
        type: legacyUrlAlias.type,
        meta: {
          title: `Legacy URL alias (${legacyUrlAlias.attributes.sourceId} -> ${legacyUrlAlias.attributes.targetId})`,
        },
        error: {
          ...legacyUrlAliasResult.error,
          type: 'unknown',
        },
        managed: legacyUrlAlias.managed,
      });
    }
  }

  return errors;
}
