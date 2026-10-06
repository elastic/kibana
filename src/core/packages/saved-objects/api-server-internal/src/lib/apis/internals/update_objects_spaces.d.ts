/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';
import {
  type SavedObjectsUpdateObjectsSpacesObject,
  type SavedObjectsUpdateObjectsSpacesOptions,
  type SavedObjectsUpdateObjectsSpacesResponse,
} from '@kbn/core-saved-objects-api-server';
import type {
  ISavedObjectsSecurityExtension,
  ISavedObjectTypeRegistry,
  ISavedObjectsSerializer,
} from '@kbn/core-saved-objects-server';
import type { IndexMapping } from '@kbn/core-saved-objects-base-server-internal';
import type { RepositoryEsClient } from '../../repository_es_client';
/**
 * Parameters for the updateObjectsSpaces function.
 *
 * @internal
 */
export interface UpdateObjectsSpacesParams {
  mappings: IndexMapping;
  registry: ISavedObjectTypeRegistry;
  allowedTypes: string[];
  client: RepositoryEsClient;
  serializer: ISavedObjectsSerializer;
  logger: Logger;
  getIndexForType: (type: string) => string;
  securityExtension: ISavedObjectsSecurityExtension | undefined;
  objects: SavedObjectsUpdateObjectsSpacesObject[];
  spacesToAdd: string[];
  spacesToRemove: string[];
  options?: SavedObjectsUpdateObjectsSpacesOptions;
}
/**
 * Gets all references and transitive references of the given objects. Ignores any object and/or reference that is not a multi-namespace
 * type.
 */
export declare function updateObjectsSpaces({
  mappings,
  registry,
  allowedTypes,
  client,
  serializer,
  logger,
  getIndexForType,
  securityExtension,
  objects,
  spacesToAdd,
  spacesToRemove,
  options,
}: UpdateObjectsSpacesParams): Promise<SavedObjectsUpdateObjectsSpacesResponse>;
