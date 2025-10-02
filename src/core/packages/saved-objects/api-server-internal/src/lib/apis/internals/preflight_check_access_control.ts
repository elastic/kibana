/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isNotFoundFromUnsupportedServer } from '@kbn/core-elasticsearch-server-internal';
import {
  type ISavedObjectsSerializer,
  type SavedObjectsRawDocSource,
  SavedObjectsErrorHelpers,
} from '@kbn/core-saved-objects-server';
import { SavedObjectsUtils } from '@kbn/core-saved-objects-utils-server';
import type { RepositoryEsClient } from '../../repository_es_client';
import type { PreflightAccessControlResult } from '../helpers';
import { isFoundGetResponse } from '../utils';

export interface AccessControlPreflightObject {
  /** The type of the object. */
  type: string;
  /** The ID of the object. */
  id: string;
  /** The namespaces the object resides in or will be created in */
  namespaces: string[]; // could be changed to single namespace?
  /** Whether or not the object should be overwritten if it would encounter a conflict. */
  overwrite?: boolean; // Do we need this here? We are relying on the authz check the condition, and normal preflight will check if there is a conflict and overwrite is false
}

export interface AccessControlBulkPreflightParams {
  client: RepositoryEsClient;
  serializer: ISavedObjectsSerializer;
  getIndexForType: (type: string) => string;
  objects: AccessControlPreflightObject[];
  namespace: string | undefined;
}

export type AccessControlPreflightParams = Omit<AccessControlBulkPreflightParams, 'objects'> & {
  object: AccessControlPreflightObject;
};

export async function accessControlBulkPreflightCheck(params: AccessControlBulkPreflightParams) {
  const { client, serializer, getIndexForType, objects, namespace } = params;

  const getNamespaceId = (objectNamespace?: string) =>
    objectNamespace !== undefined
      ? SavedObjectsUtils.namespaceStringToId(objectNamespace)
      : namespace;

  const bulkGetDocs = objects.map(({ type, id, namespaces }) => ({
    _id: serializer.generateRawId(getNamespaceId(namespace), type, id),
    _index: getIndexForType(type),
    _source: ['type', 'id', 'accessControl'],
  }));

  const bulkGetResponse = bulkGetDocs.length
    ? await client.mget<SavedObjectsRawDocSource>(
        { docs: bulkGetDocs },
        { ignore: [404], meta: true }
      )
    : undefined;

  // throw if we can't verify a 404 response is from Elasticsearch
  if (
    bulkGetResponse &&
    isNotFoundFromUnsupportedServer({
      statusCode: bulkGetResponse.statusCode,
      headers: bulkGetResponse.headers,
    })
  ) {
    throw SavedObjectsErrorHelpers.createGenericNotFoundEsUnavailableError();
  }

  return bulkGetResponse;
}

export async function accessControlPreflightCheck(
  params: AccessControlPreflightParams
): Promise<PreflightAccessControlResult> {
  const { client, serializer, getIndexForType, object, namespace } = params;

  const getNamespaceId = (objectNamespace?: string) =>
    objectNamespace !== undefined
      ? SavedObjectsUtils.namespaceStringToId(objectNamespace)
      : namespace;

  const getResponse = await client.get<SavedObjectsRawDocSource>(
    {
      id: serializer.generateRawId(getNamespaceId(namespace), object.type, object.id),
      index: getIndexForType(object.type),
    },
    { ignore: [404], meta: true }
  );

  // throw if we can't verify a 404 response is from Elasticsearch

  if (isFoundGetResponse(getResponse.body)) {
    return {
      rawDocSource: getResponse.body,
    };
  }
  if (
    getResponse &&
    isNotFoundFromUnsupportedServer({
      statusCode: getResponse.statusCode,
      headers: getResponse.headers,
    })
  ) {
    throw SavedObjectsErrorHelpers.createGenericNotFoundEsUnavailableError();
  }

  return {
    rawDocSource: undefined,
  };
}
