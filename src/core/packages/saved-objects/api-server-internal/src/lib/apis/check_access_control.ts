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
  SavedObjectsBaseOptions,
} from '@kbn/core-saved-objects-api-server';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import type {
  ObjectRequiringPrivilegeCheckResult,
  AuthorizeObject,
} from '@kbn/core-saved-objects-server/src/extensions/security';
import { SavedObjectsUtils } from '@kbn/core-saved-objects-utils-server';
import type { ApiExecutionContext } from './types';

export interface PerformChangeAccessModeParams {
  objects: SavedObjectsChangeAccessControlObject[];
  options: SavedObjectsBaseOptions;
}

export const performCheckAccessControl = async (
  { objects, options }: PerformChangeAccessModeParams,
  { registry, helpers, allowedTypes, client, serializer, extensions = {} }: ApiExecutionContext
): Promise<ObjectRequiringPrivilegeCheckResult[]> => {
  const { common: commonHelper, user: userHelper, preflight: preflightHelper } = helpers;
  const { securityExtension } = extensions;
  const currentUserProfileUid = userHelper.getCurrentUserProfileUid();

  // if (!currentUserProfileUid) {
  //   throw new Error('Unexpected error in changeAccessMode: currentUserProfile is undefined.');
  // }

  if (!securityExtension) {
    throw SavedObjectsErrorHelpers.createBadRequestError(
      'Unable to proceed with changing access control without security extension.'
    );
  }

  const namespace = commonHelper.getCurrentNamespace(options.namespace);
  const namespaceString = SavedObjectsUtils.namespaceIdToString(namespace);

  // const typeSupportsAccessControl = registry.supportsAccessControl(type);

  const accessControlPreflightObjects = objects
    .filter((value) => registry.supportsAccessControl(value.type))
    .map((value) => {
      const { type, id } = value;
      const namespaces = /* object.initialNamespaces ??*/ [namespaceString];
      return { type, id, namespaces };
    });

  const accessControlPreflightResponse = await preflightHelper.accessControlBulkPreflightCheck(
    accessControlPreflightObjects,
    namespace
  );

  const authObjects = accessControlPreflightResponse?.body.docs
    // @ts-expect-error MultiGetHit._source is optional
    .filter((doc) => !!doc._source)
    .map((doc) => {
      return {
        // @ts-expect-error MultiGetHit._source is optional
        type: doc._source.type,
        // @ts-expect-error MultiGetHit._source is optional
        id: doc._source.id,
        // @ts-expect-error MultiGetHit._source is optional
        accessControl: doc._source.accessControl,
      } as AuthorizeObject;
    });

  if (!authObjects) return [];
  const { objects: results } = securityExtension?.getTypesRequiringAccessControlCheck(authObjects);
  return results;
};
