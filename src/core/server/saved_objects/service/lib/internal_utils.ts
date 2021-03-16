/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ISavedObjectTypeRegistry } from '../../saved_objects_type_registry';
import type { SavedObjectsRawDoc, SavedObjectsRawDocSource } from '../../serialization';
import type { SavedObject } from '../../types';
import { decodeRequestVersion, encodeHitVersion } from '../../version';
import { SavedObjectsErrorHelpers } from './errors';
import { SavedObjectsUtils } from './utils';

/**
 * Checks the raw response of a bulk operation and returns an error if necessary.
 *
 * @param type
 * @param id
 * @param rawResponse
 *
 * @internal
 */
export function getBulkOperationError(
  type: string,
  id: string,
  rawResponse: {
    status: number;
    error?: { type: string; reason: string; index: string };
    // Other fields are present on a bulk operation result but they are irrelevant for this function
  }
) {
  const { status, error } = rawResponse;
  if (error) {
    switch (status) {
      case 404:
        return error.type === 'index_not_found_exception'
          ? SavedObjectsErrorHelpers.createIndexAliasNotFoundError(error.index).output.payload
          : SavedObjectsErrorHelpers.createGenericNotFoundError(type, id).output.payload;
      case 409:
        return SavedObjectsErrorHelpers.createConflictError(type, id).output.payload;
      default:
        return {
          error: 'Internal Server Error',
          message: `Unexpected bulk response [${status}] ${error.type}: ${error.reason}`,
          statusCode: 500,
        };
    }
  }
  return undefined;
}

/**
 * Returns an object with the expected version properties. This facilitates Elasticsearch's Optimistic Concurrency Control.
 *
 * @param version Optional version specified by the consumer.
 * @param document Optional existing document that was obtained in a preflight operation.
 *
 * @internal
 */
export function getExpectedVersionProperties(version?: string, document?: SavedObjectsRawDoc) {
  if (version) {
    return decodeRequestVersion(version);
  } else if (document) {
    return {
      if_seq_no: document._seq_no,
      if_primary_term: document._primary_term,
    };
  }
  return {};
}

/**
 * Gets a saved object from a raw ES document.
 *
 * @param registry
 * @param type
 * @param id
 * @param doc
 *
 * @internal
 */
export function getSavedObjectFromSource<T>(
  registry: ISavedObjectTypeRegistry,
  type: string,
  id: string,
  doc: { _seq_no?: number; _primary_term?: number; _source: SavedObjectsRawDocSource }
): SavedObject<T> {
  const { originId, updated_at: updatedAt } = doc._source;

  let namespaces: string[] = [];
  if (!registry.isNamespaceAgnostic(type)) {
    namespaces = doc._source.namespaces ?? [
      SavedObjectsUtils.namespaceIdToString(doc._source.namespace),
    ];
  }

  return {
    id,
    type,
    namespaces,
    ...(originId && { originId }),
    ...(updatedAt && { updated_at: updatedAt }),
    version: encodeHitVersion(doc),
    attributes: doc._source[type],
    references: doc._source.references || [],
    migrationVersion: doc._source.migrationVersion,
    coreMigrationVersion: doc._source.coreMigrationVersion,
  };
}
