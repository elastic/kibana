/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  SavedObjectsChangeAccessControlObject,
  SavedObjectsChangeAccessControlOptions,
  SavedObjectsChangeAccessControlResponse,
  SavedObjectsChangeAccessModeOptions,
} from '@kbn/core-saved-objects-api-server';

import { changeObjectAccessControl } from './internals/change_object_access_control';
import type { ApiExecutionContext } from './types';

export interface PerformChangeAccessModeParams<T = unknown> {
  objects: SavedObjectsChangeAccessControlObject[];
  options: SavedObjectsChangeAccessControlOptions<T>;
}

export const isSavedObjectsChangeAccessModeOptions = <Attributes = unknown>(
  options: unknown
): options is SavedObjectsChangeAccessModeOptions<Attributes> => {
  return (
    typeof options === 'object' &&
    options !== null &&
    (typeof (options as any).accessMode === 'undefined' ||
      (options as any).accessMode === 'read_only')
  );
};

export const performChangeAccessMode = async <T>(
  { objects, options }: PerformChangeAccessModeParams<T>,
  { registry, helpers, allowedTypes, client, serializer, extensions = {} }: ApiExecutionContext
): Promise<SavedObjectsChangeAccessControlResponse> => {
  const { common: commonHelper } = helpers;
  const { securityExtension } = extensions;

  if (!isSavedObjectsChangeAccessModeOptions(options)) {
    throw new Error('Invalid options provided to change access mode');
  }

  const namespace = commonHelper.getCurrentNamespace(options.namespace);
  return changeObjectAccessControl({
    registry,
    allowedTypes,
    client,
    serializer,
    getIndexForType: commonHelper.getIndexForType.bind(commonHelper),
    objects,
    options: { ...options, namespace },
    securityExtension,
    actionType: 'changeAccessMode',
  });
};
