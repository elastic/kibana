/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Payload } from '@hapi/boom';
import { isNotFoundFromUnsupportedServer } from '@kbn/core-elasticsearch-server-internal';
import {
  SavedObjectsErrorHelpers,
  SavedObjectsRawDocSource,
  SavedObjectsRawDoc,
} from '@kbn/core-saved-objects-server';
import {
  SavedObjectsCheckConflictsObject,
  SavedObjectsBaseOptions,
  SavedObjectsCheckConflictsResponse,
} from '@kbn/core-saved-objects-api-server';
import {
  Either,
  errorContent,
  left,
  right,
  isLeft,
  isRight,
  isMgetDoc,
  rawDocExistsInNamespace,
} from './utils';
import { ApiExecutionContext } from './types';

export interface PerformCheckConflictsParams<T = unknown> {
  objects: SavedObjectsCheckConflictsObject[];
  options: SavedObjectsBaseOptions;
}

export const performCheckConflicts = async <T>(
  { objects, options }: PerformCheckConflictsParams<T>,
  { registry, helpers, allowedTypes, client, serializer, extensions = {} }: ApiExecutionContext
): Promise<SavedObjectsCheckConflictsResponse> => {
  const { common: commonHelper } = helpers;
  const { securityExtension } = extensions;

  const namespace = commonHelper.getCurrentNamespace(options.namespace);

  if (objects.length === 0) {
    return { errors: [] };
  }

  let bulkGetRequestIndexCounter = 0;
  type ExpectedBulkGetResult = Either<
    { type: string; id: string; error: Payload },
    { type: string; id: string; esRequestIndex: number }
  >;
  const expectedBulkGetResults = objects.map<ExpectedBulkGetResult>((object) => {
    const { type, id } = object;

    if (!allowedTypes.includes(type)) {
      return left({
        id,
        type,
        error: errorContent(SavedObjectsErrorHelpers.createUnsupportedTypeError(type)),
      });
    }

    return right({
      type,
      id,
      esRequestIndex: bulkGetRequestIndexCounter++,
    });
  });

  const validObjects = expectedBulkGetResults.filter(isRight);
  await securityExtension?.authorizeCheckConflicts({
    namespace,
    objects: validObjects.map((element) => ({ type: element.value.type, id: element.value.id })),
  });

  const bulkGetDocs = validObjects.map(({ value: { type, id } }) => ({
    _id: serializer.generateRawId(namespace, type, id),
    _index: commonHelper.getIndexForType(type),
    _source: { includes: ['type', 'namespaces'] },
  }));
  const bulkGetResponse = bulkGetDocs.length
    ? await client.mget<SavedObjectsRawDocSource>(
        {
          body: {
            docs: bulkGetDocs,
          },
        },
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

  const errors: SavedObjectsCheckConflictsResponse['errors'] = [];
  expectedBulkGetResults.forEach((expectedResult) => {
    if (isLeft(expectedResult)) {
      errors.push(expectedResult.value as any);
      return;
    }

    const { type, id, esRequestIndex } = expectedResult.value;
    const doc = bulkGetResponse?.body.docs[esRequestIndex];
    if (isMgetDoc(doc) && doc.found) {
      errors.push({
        id,
        type,
        error: {
          ...errorContent(SavedObjectsErrorHelpers.createConflictError(type, id)),
          ...(!rawDocExistsInNamespace(registry, doc! as SavedObjectsRawDoc, namespace) && {
            metadata: { isNotOverwritable: true },
          }),
        },
      });
    }
  });

  return { errors };
};
