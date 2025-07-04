/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Boom, { Payload } from '@hapi/boom';
import { isNotFoundFromUnsupportedServer } from '@kbn/core-elasticsearch-server-internal';
import {
  SavedObjectsErrorHelpers,
  type SavedObject,
  DecoratedError,
  SavedObjectsRawDocSource,
  AuthorizeBulkGetObject,
} from '@kbn/core-saved-objects-server';
import { ALL_NAMESPACES_STRING, SavedObjectsUtils } from '@kbn/core-saved-objects-utils-server';
import {
  SavedObjectsBulkGetObject,
  SavedObjectsBulkResponse,
  SavedObjectsGetOptions,
} from '@kbn/core-saved-objects-api-server';
import { includedFields } from '../utils';
import {
  Either,
  errorContent,
  getSavedObjectFromSource,
  isLeft,
  isRight,
  left,
  right,
  rawDocExistsInNamespaces,
} from './utils';
import { ApiExecutionContext } from './types';

export interface PerformBulkGetParams<T = unknown> {
  objects: SavedObjectsBulkGetObject[];
  options: SavedObjectsGetOptions;
}

type ExpectedBulkGetResult = Either<
  { type: string; id: string; error: Payload },
  { type: string; id: string; fields?: string[]; namespaces?: string[]; esRequestIndex: number }
>;

export const performBulkGet = async <T>(
  { objects, options }: PerformBulkGetParams<T>,
  { helpers, allowedTypes, client, serializer, registry, extensions = {} }: ApiExecutionContext
): Promise<SavedObjectsBulkResponse<T>> => {
  const {
    common: commonHelper,
    validation: validationHelper,
    migration: migrationHelper,
  } = helpers;
  const { securityExtension, spacesExtension } = extensions;

  const namespace = commonHelper.getCurrentNamespace(options.namespace);
  const { migrationVersionCompatibility } = options;

  if (objects.length === 0) {
    return { saved_objects: [] };
  }

  let availableSpacesPromise: Promise<string[]> | undefined;
  const getAvailableSpaces = async () => {
    if (!availableSpacesPromise) {
      availableSpacesPromise = spacesExtension!
        .getSearchableNamespaces([ALL_NAMESPACES_STRING])
        .catch((err) => {
          if (Boom.isBoom(err) && err.output.payload.statusCode === 403) {
            // the user doesn't have access to any spaces; return the current space ID and allow the SOR authZ check to fail
            return [SavedObjectsUtils.namespaceIdToString(namespace)];
          } else {
            throw err;
          }
        });
    }
    return availableSpacesPromise;
  };

  let bulkGetRequestIndexCounter = 0;
  const expectedBulkGetResults = await Promise.all(
    objects.map<Promise<ExpectedBulkGetResult>>(async (object) => {
      const { type, id, fields } = object;

      let error: DecoratedError | undefined;
      if (!allowedTypes.includes(type)) {
        error = SavedObjectsErrorHelpers.createUnsupportedTypeError(type);
      } else {
        try {
          validationHelper.validateObjectNamespaces(type, id, object.namespaces);
        } catch (e) {
          error = e;
        }
      }

      if (error) {
        return left({ id, type, error: errorContent(error) });
      }

      let namespaces = object.namespaces;
      if (spacesExtension && namespaces?.includes(ALL_NAMESPACES_STRING)) {
        namespaces = await getAvailableSpaces();
      }

      const getFields = (savedObjectFields?: string[]) => {
        const isEmpty = !savedObjectFields || savedObjectFields.length === 0;

        if (securityExtension && securityExtension.includeSavedObjectNames() && !isEmpty) {
          const nameAttribute = registry.getNameAttribute(type);
          const nameFields = nameAttribute !== 'unknown' ? [nameAttribute] : ['name', 'title'];

          return [...savedObjectFields, ...nameFields];
        }

        return fields;
      };

      return right({
        type,
        id,
        fields: getFields(fields),
        namespaces,
        esRequestIndex: bulkGetRequestIndexCounter++,
      });
    })
  );

  const validObjects = expectedBulkGetResults.filter(isRight);
  if (validObjects.length === 0) {
    // We only have error results; return early to avoid potentially trying authZ checks for 0 types which would result in an exception.
    return {
      // Technically the returned array should only contain SavedObject results, but for errors this is not true (we cast to 'any' below)
      saved_objects: expectedBulkGetResults.map<SavedObject<T>>(
        ({ value }) => value as unknown as SavedObject<T>
      ),
    };
  }

  const getNamespaceId = (namespaces?: string[]) =>
    namespaces !== undefined ? SavedObjectsUtils.namespaceStringToId(namespaces[0]) : namespace;
  const bulkGetDocs = validObjects.map(({ value: { type, id, fields, namespaces } }) => ({
    _id: serializer.generateRawId(getNamespaceId(namespaces), type, id), // the namespace prefix is only used for single-namespace object types
    _index: commonHelper.getIndexForType(type),
    _source: { includes: includedFields(type, fields) },
  }));
  const bulkGetResponse = bulkGetDocs.length
    ? await client.mget<SavedObjectsRawDocSource>(
        { docs: bulkGetDocs },
        { ignore: [404], meta: true }
      )
    : undefined;
  // fail fast if we can't verify a 404 is from Elasticsearch
  if (
    bulkGetResponse &&
    isNotFoundFromUnsupportedServer({
      statusCode: bulkGetResponse.statusCode,
      headers: bulkGetResponse.headers,
    })
  ) {
    throw SavedObjectsErrorHelpers.createGenericNotFoundEsUnavailableError();
  }

  const authObjects: AuthorizeBulkGetObject[] = [];
  const documents = expectedBulkGetResults.map<SavedObject<T>>((expectedResult) => {
    if (isLeft(expectedResult)) {
      const { type, id } = expectedResult.value;
      authObjects.push({ type, id, existingNamespaces: [], error: true });
      return expectedResult.value as any;
    }

    const {
      type,
      id,
      // set to default namespaces value for `rawDocExistsInNamespaces` check below
      namespaces = [SavedObjectsUtils.namespaceIdToString(namespace)],
      esRequestIndex,
    } = expectedResult.value;

    const doc = bulkGetResponse?.body.docs[esRequestIndex];

    // @ts-expect-error MultiGetHit._source is optional
    const docNotFound = !doc?.found || !rawDocExistsInNamespaces(registry, doc, namespaces);

    const savedObject = docNotFound
      ? ({
          id,
          type,
          error: errorContent(SavedObjectsErrorHelpers.createGenericNotFoundError(type, id)),
        } as any as SavedObject<T>)
      : // @ts-expect-error MultiGetHit._source is optional
        getSavedObjectFromSource(registry, type, id, doc, {
          migrationVersionCompatibility,
        });

    authObjects.push({
      type,
      id,
      objectNamespaces: namespaces,
      // @ts-expect-error MultiGetHit._source is optional
      existingNamespaces: doc?._source?.namespaces ?? [],
      error: docNotFound,
      name: !docNotFound
        ? SavedObjectsUtils.getName(registry.getNameAttribute(type), savedObject)
        : undefined,
    });

    return savedObject;
  });

  const authorizationResult = await securityExtension?.authorizeBulkGet({
    namespace,
    objects: authObjects,
  });

  const results: Array<SavedObject<T>> = [];
  for (const doc of documents) {
    results.push(
      doc.error
        ? doc
        : await migrationHelper.migrateAndDecryptStorageDocument({
            document: doc,
            typeMap: authorizationResult?.typeMap,
          })
    );
  }

  return {
    saved_objects: results,
  };
};
