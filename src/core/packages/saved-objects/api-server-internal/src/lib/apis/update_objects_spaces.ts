/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  SavedObjectsUpdateObjectsSpacesObject,
  SavedObjectsUpdateObjectsSpacesOptions,
  SavedObjectsUpdateObjectsSpacesResponse,
} from '@kbn/core-saved-objects-api-server';
import { ApiExecutionContext } from './types';
import { updateObjectsSpaces } from './internals/update_objects_spaces';

export interface PerformCreateParams<T = unknown> {
  objects: SavedObjectsUpdateObjectsSpacesObject[];
  spacesToAdd: string[];
  spacesToRemove: string[];
  options: SavedObjectsUpdateObjectsSpacesOptions;
}

export const performUpdateObjectsSpaces = async <T>(
  { objects, spacesToAdd, spacesToRemove, options }: PerformCreateParams<T>,
  {
    registry,
    helpers,
    allowedTypes,
    client,
    serializer,
    logger,
    mappings,
    extensions = {},
  }: ApiExecutionContext
): Promise<SavedObjectsUpdateObjectsSpacesResponse> => {
  const { common: commonHelper } = helpers;
  const { securityExtension } = extensions;

  const namespace = commonHelper.getCurrentNamespace(options.namespace);
  return updateObjectsSpaces({
    mappings,
    registry,
    allowedTypes,
    client,
    serializer,
    logger,
    getIndexForType: commonHelper.getIndexForType.bind(commonHelper),
    securityExtension,
    objects,
    spacesToAdd,
    spacesToRemove,
    options: { ...options, namespace },
  });
};
