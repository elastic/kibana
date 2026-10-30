/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ACL_FIELD, normalizeAclSource, type AclChange } from '@kbn/access-control';
import { isSupportedEsServer } from '@kbn/core-elasticsearch-server-internal';
import { encodeHitVersion } from '@kbn/core-saved-objects-base-server-internal';
import {
  SavedObjectsErrorHelpers,
  type SavedObjectsRawDocSource,
} from '@kbn/core-saved-objects-server';
import type {
  SavedObjectsChangeAclOptions,
  SavedObjectsChangeAclResponse,
} from '@kbn/core-saved-objects-api-server';
import { isFoundGetResponse, rawDocExistsInNamespace } from './utils';
import type { ApiExecutionContext } from './types';

export interface PerformChangeAclParams {
  type: string;
  id: string;
  change: AclChange;
  options: SavedObjectsChangeAclOptions;
}

export const performChangeAcl = async (
  { type, id, change, options }: PerformChangeAclParams,
  { registry, helpers, allowedTypes, client, serializer }: ApiExecutionContext
): Promise<SavedObjectsChangeAclResponse> => {
  const { common: commonHelper, acl: aclHelper } = helpers;
  const namespace = commonHelper.getCurrentNamespace(options.namespace);
  if (!allowedTypes.includes(type)) {
    throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
  }

  if (!aclHelper.isEnforced(type)) {
    throw SavedObjectsErrorHelpers.createBadRequestError(
      `Type ${type} does not support object-level access control`
    );
  }

  const { body, statusCode, headers } = await client.get<SavedObjectsRawDocSource>(
    {
      id: serializer.generateRawId(namespace, type, id),
      index: commonHelper.getIndexForType(type),
    },
    { ignore: [404], meta: true }
  );
  if (statusCode === 404 && !isSupportedEsServer(headers)) {
    throw SavedObjectsErrorHelpers.createGenericNotFoundEsUnavailableError(type, id);
  }
  if (!isFoundGetResponse(body) || !rawDocExistsInNamespace(registry, body, namespace)) {
    throw SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
  }

  // The version is compared only after the visibility check, so that a caller who cannot see the
  // object never learns that it changed.
  const object = { type, id, source: body._source };
  await aclHelper.enforce('view', namespace, object);
  if (options.version !== encodeHitVersion(body)) {
    throw SavedObjectsErrorHelpers.createConflictError(type, id);
  }

  const { next, warnings } = await aclHelper.authorizeChange(namespace, object, change);

  // An access change is not a content edit: everything except the ACL stays byte for byte, including
  // encrypted attributes and `updated_at`. Dotted root keys are removed, so they cannot keep revoked
  // grants alive next to the new ACL.
  const source = Object.fromEntries(
    Object.entries(body._source).filter(
      ([key]) => key !== ACL_FIELD && !key.startsWith(`${ACL_FIELD}.`)
    )
  );
  const response = await client
    .index({
      id: body._id,
      index: commonHelper.getIndexForType(type),
      document: { ...source, [ACL_FIELD]: next },
      if_seq_no: body._seq_no,
      if_primary_term: body._primary_term,
      refresh: options.refresh ?? 'wait_for',
      require_alias: true,
    })
    .catch((error) => {
      if (SavedObjectsErrorHelpers.isConflictError(error)) {
        throw SavedObjectsErrorHelpers.createConflictError(type, id);
      }
      throw error;
    });

  return {
    type,
    id,
    version: encodeHitVersion(response),
    acl: normalizeAclSource({ [ACL_FIELD]: next })!,
    warnings,
  };
};
