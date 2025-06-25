/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsChangeOwnershipOptions } from '@kbn/core-saved-objects-api-server';
import { SavedObjectsErrorHelpers, type SavedObject } from '@kbn/core-saved-objects-server';
import { isValidRequest } from '../utils';
import type { ApiExecutionContext } from './types';
import { getSavedObjectFromSource } from './utils';

export interface PerformChangeOwnershipParams<T = unknown> {
  type: string;
  id: string;
  options: SavedObjectsChangeOwnershipOptions<T>;
}

export const performChangeOwnership = async <T>(
  { type, id, options }: PerformChangeOwnershipParams<T>,
  {
    registry,
    helpers,
    allowedTypes,
    client,
    serializer,
    migrator,
    extensions = {},
  }: ApiExecutionContext
): Promise<SavedObjectsChangeOwnershipResponse<T>> => {
  const namespace = helpers.common.getCurrentNamespace(options.namespace);
  const { securityExtension } = extensions;
  const { preflight: preflightHelper, migration: migrationHelper } = helpers;
  // check request is valid
  const { validRequest, error } = isValidRequest({ allowedTypes, type, id });
  if (!validRequest && error) {
    throw error;
  }

  if (securityExtension) {
    const preflightDocResult = await preflightHelper.preflightGetDocForUpdate({
      type,
      id,
      namespace,
    });

    const preflightDocNSResult = preflightHelper.preflightCheckNamespacesForUpdate({
      type,
      id,
      namespace,
      preflightDocResult,
    });
    const existingNamespaces = preflightDocNSResult.savedObjectNamespaces ?? [];
    const accessControl = preflightDocNSResult.rawDocSource?._source.accessControl;

    let migrated: SavedObject<T>;
    if (preflightDocResult.checkDocFound === 'found') {
      const document = getSavedObjectFromSource<T>(
        registry,
        type,
        id,
        preflightDocResult.rawDocSource!
      );
      try {
        migrated = migrationHelper.migrateStorageDocument(document) as SavedObject<T>;
      } catch (migrateStorageDocError) {
        throw SavedObjectsErrorHelpers.decorateGeneralError(
          migrateStorageDocError,
          'Failed to migrate document to the latest version.'
        );
      }
    }

    const authorizationResult = await securityExtension.authorizeChangeOwnership({
      namespace,
      object: {
        type,
        id,
        existingNamespaces,
        ...(accessControl && {
          accessControl,
        }),
      },
    });
    const docToSend: SavedObject<T> = { ...document };
    return docToSend;
  }
};
