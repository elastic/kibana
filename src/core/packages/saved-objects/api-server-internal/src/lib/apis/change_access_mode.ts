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
  SavedObjectsChangeAccessModeOptions,
  SavedObjectsChangeAccessControlResponse,
} from '@kbn/core-saved-objects-api-server';

import {
  changeObjectAccessControl,
  isSavedObjectsChangeAccessModeOptions,
} from './internals/change_object_access_control';
import type { ApiExecutionContext } from './types';

export interface PerformChangeAccessModeParams {
  objects: SavedObjectsChangeAccessControlObject[];
  options: SavedObjectsChangeAccessModeOptions;
}

export const performChangeAccessMode = async (
  { objects, options }: PerformChangeAccessModeParams,
  { registry, helpers, allowedTypes, client, serializer, extensions = {} }: ApiExecutionContext
): Promise<SavedObjectsChangeAccessControlResponse> => {
  const { common: commonHelper, user: userHelper } = helpers;
  const { securityExtension } = extensions;
  const currentUserProfileUid = userHelper.getCurrentUserProfileUid();

  if (!currentUserProfileUid) {
    throw new Error('Unexpected error in changeAccessMode: currentUserProfile is undefined.');
  }

  if (!isSavedObjectsChangeAccessModeOptions(options)) {
    throw new Error('Unexpected error in changeAccessMode: invalid options');
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
    currentUserProfileUid,
  });
};
