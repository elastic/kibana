/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Payload } from '@hapi/boom';
import {
  SavedObjectsErrorHelpers,
  type SavedObject,
  type SavedObjectSanitizedDoc,
  DecoratedError,
  AuthorizeCreateObject,
  SavedObjectsRawDoc,
} from '@kbn/core-saved-objects-server';
import { SavedObjectsUtils } from '@kbn/core-saved-objects-utils-server';
import {
  SavedObjectsCreateOptions,
  SavedObjectsBulkCreateObject,
  SavedObjectsBulkResponse,
} from '@kbn/core-saved-objects-api-server';
import { DEFAULT_REFRESH_SETTING } from '../constants';
import {
  Either,
  getBulkOperationError,
  getCurrentTime,
  getExpectedVersionProperties,
  left,
  right,
  isLeft,
  isRight,
  normalizeNamespace,
  setManaged,
  errorContent,
} from './utils';
import { getSavedObjectNamespaces } from './utils';
import { PreflightCheckForCreateObject } from './internals/preflight_check_for_create';
import { ApiExecutionContext } from './types';

export interface PerformBulkCreateParams<T = unknown> {
  objects: Array<SavedObjectsBulkCreateObject<T>>;
  options: SavedObjectsCreateOptions;
}

type ExpectedResult = Either<
  { type: string; id?: string; error: Payload },
  {
    method: 'index' | 'create';
    object: SavedObjectsBulkCreateObject & { id: string };
    preflightCheckIndex?: number;
  }
>;

export const performBulkCreate = async <T>(
  { objects, options }: PerformBulkCreateParams<T>,
  {
    registry,
    helpers,
    allowedTypes,
    client,
    serializer,
    migrator,
    extensions = {},
  }: ApiExecutionContext
): Promise<SavedObjectsBulkResponse<T>> => {
  const {
    common: commonHelper,
    validation: validationHelper,
    encryption: encryptionHelper,
    preflight: preflightHelper,
    serializer: serializerHelper,
    migration: migrationHelper,
    user: userHelper,
  } = helpers;
  const { securityExtension } = extensions;
  const namespace = commonHelper.getCurrentNamespace(options.namespace);

  const {
    migrationVersionCompatibility,
    overwrite = false,
    refresh = DEFAULT_REFRESH_SETTING,
    managed: optionsManaged,
  } = options;
  const time = getCurrentTime();
  const createdBy = userHelper.getCurrentUserProfileUid();
  const updatedBy = createdBy;

  let preflightCheckIndexCounter = 0;
  const expectedResults = objects.map<ExpectedResult>((object) => {
    const { type, id: requestId, initialNamespaces, version, managed } = object;
    let error: DecoratedError | undefined;
    let id: string = ''; // Assign to make TS happy, the ID will be validated (or randomly generated if needed) during getValidId below
    const objectManaged = managed;
    if (!allowedTypes.includes(type)) {
      error = SavedObjectsErrorHelpers.createUnsupportedTypeError(type);
    } else {
      try {
        id = commonHelper.getValidId(type, requestId, version, overwrite);
        validationHelper.validateInitialNamespaces(type, initialNamespaces);
        validationHelper.validateOriginId(type, object);
      } catch (e) {
        error = e;
      }
    }

    if (error) {
      return left({ id: requestId, type, error: errorContent(error) });
    }

    const method = requestId && overwrite ? 'index' : 'create';
    const requiresNamespacesCheck = requestId && registry.isMultiNamespace(type);

    return right({
      method,
      object: {
        ...object,
        id,
        managed: setManaged({ optionsManaged, objectManaged }),
      },
      ...(requiresNamespacesCheck && { preflightCheckIndex: preflightCheckIndexCounter++ }),
    }) as ExpectedResult;
  });

  const validObjects = expectedResults.filter(isRight);
  if (validObjects.length === 0) {
    // We only have error results; return early to avoid potentially trying authZ checks for 0 types which would result in an exception.
    return {
      // Technically the returned array should only contain SavedObject results, but for errors this is not true (we cast to 'unknown' below)
      saved_objects: expectedResults.map<SavedObject<T>>(
        ({ value }) => value as unknown as SavedObject<T>
      ),
    };
  }

  const namespaceString = SavedObjectsUtils.namespaceIdToString(namespace);
  const preflightCheckObjects = validObjects
    .filter(({ value }) => value.preflightCheckIndex !== undefined)
    .map<PreflightCheckForCreateObject>(({ value }) => {
      const { type, id, initialNamespaces } = value.object;
      const namespaces = initialNamespaces ?? [namespaceString];
      return { type, id, overwrite, namespaces };
    });
  const preflightCheckResponse = await preflightHelper.preflightCheckForCreate(
    preflightCheckObjects
  );

  const authObjects: AuthorizeCreateObject[] = validObjects.map((element) => {
    const { object, preflightCheckIndex: index } = element.value;
    const preflightResult = index !== undefined ? preflightCheckResponse[index] : undefined;

    return {
      type: object.type,
      id: object.id,
      initialNamespaces: object.initialNamespaces,
      existingNamespaces: preflightResult?.existingDocument?._source.namespaces ?? [],
      name: SavedObjectsUtils.getName(registry.getNameAttribute(object.type), object),
    };
  });

  const authorizationResult = await securityExtension?.authorizeBulkCreate({
    namespace,
    objects: authObjects,
  });

  let bulkRequestIndexCounter = 0;
  const bulkCreateParams: object[] = [];
  type ExpectedBulkResult = Either<
    { type: string; id?: string; error: Payload },
    { esRequestIndex: number; requestedId: string; rawMigratedDoc: SavedObjectsRawDoc }
  >;
  const expectedBulkResults = await Promise.all(
    expectedResults.map<Promise<ExpectedBulkResult>>(async (expectedBulkGetResult) => {
      if (isLeft(expectedBulkGetResult)) {
        return expectedBulkGetResult;
      }

      let savedObjectNamespace: string | undefined;
      let savedObjectNamespaces: string[] | undefined;
      let existingOriginId: string | undefined;
      let versionProperties;
      const {
        preflightCheckIndex,
        object: { initialNamespaces, version, ...object },
        method,
      } = expectedBulkGetResult.value;
      if (preflightCheckIndex !== undefined) {
        const preflightResult = preflightCheckResponse[preflightCheckIndex];
        const { type, id, existingDocument, error } = preflightResult;
        if (error) {
          const { metadata } = error;
          return left({
            id,
            type,
            error: {
              ...errorContent(SavedObjectsErrorHelpers.createConflictError(type, id)),
              ...(metadata && { metadata }),
            },
          });
        }
        savedObjectNamespaces =
          initialNamespaces || getSavedObjectNamespaces(namespace, existingDocument);
        versionProperties = getExpectedVersionProperties(version);
        existingOriginId = existingDocument?._source?.originId;
      } else {
        if (registry.isSingleNamespace(object.type)) {
          savedObjectNamespace = initialNamespaces
            ? normalizeNamespace(initialNamespaces[0])
            : namespace;
        } else if (registry.isMultiNamespace(object.type)) {
          savedObjectNamespaces = initialNamespaces || getSavedObjectNamespaces(namespace);
        }
        versionProperties = getExpectedVersionProperties(version);
      }

      // 1. If the originId has been *explicitly set* in the options (defined or undefined), respect that.
      // 2. Otherwise, preserve the originId of the existing object that is being overwritten, if any.
      const originId = Object.keys(object).includes('originId')
        ? object.originId
        : existingOriginId;
      const migrated = migrationHelper.migrateInputDocument({
        id: object.id,
        type: object.type,
        attributes: await encryptionHelper.optionallyEncryptAttributes(
          object.type,
          object.id,
          savedObjectNamespace, // only used for multi-namespace object types
          object.attributes
        ),
        migrationVersion: object.migrationVersion,
        coreMigrationVersion: object.coreMigrationVersion,
        typeMigrationVersion: object.typeMigrationVersion,
        ...(savedObjectNamespace && { namespace: savedObjectNamespace }),
        ...(savedObjectNamespaces && { namespaces: savedObjectNamespaces }),
        managed: setManaged({ optionsManaged, objectManaged: object.managed }),
        updated_at: time,
        created_at: time,
        ...(createdBy && { created_by: createdBy }),
        ...(updatedBy && { updated_by: updatedBy }),
        references: object.references || [],
        originId,
      }) as SavedObjectSanitizedDoc<T>;

      /**
       * If a validation has been registered for this type, we run it against the migrated attributes.
       * This is an imperfect solution because malformed attributes could have already caused the
       * migration to fail, but it's the best we can do without devising a way to run validations
       * inside the migration algorithm itself.
       */
      try {
        validationHelper.validateObjectForCreate(object.type, migrated);
      } catch (error) {
        return left({
          id: object.id,
          type: object.type,
          error,
        });
      }

      const expectedResult = {
        esRequestIndex: bulkRequestIndexCounter++,
        requestedId: object.id,
        rawMigratedDoc: serializer.savedObjectToRaw(migrated),
      };

      bulkCreateParams.push(
        {
          [method]: {
            _id: expectedResult.rawMigratedDoc._id,
            _index: commonHelper.getIndexForType(object.type),
            ...(overwrite && versionProperties),
          },
        },
        expectedResult.rawMigratedDoc._source
      );

      return right(expectedResult);
    })
  );

  const bulkResponse = bulkCreateParams.length
    ? await client.bulk({
        refresh,
        require_alias: true,
        operations: bulkCreateParams,
      })
    : undefined;

  const result = {
    saved_objects: expectedBulkResults.map((expectedResult) => {
      if (isLeft(expectedResult)) {
        return expectedResult.value as any;
      }

      const { requestedId, rawMigratedDoc, esRequestIndex } = expectedResult.value;
      const rawResponse = Object.values(bulkResponse?.items[esRequestIndex] ?? {})[0] as any;

      const error = getBulkOperationError(rawMigratedDoc._source.type, requestedId, rawResponse);
      if (error) {
        return { type: rawMigratedDoc._source.type, id: requestedId, error };
      }

      // When method == 'index' the bulkResponse doesn't include the indexed
      // _source so we return rawMigratedDoc but have to spread the latest
      // _seq_no and _primary_term values from the rawResponse.
      return serializerHelper.rawToSavedObject(
        {
          ...rawMigratedDoc,
          ...{ _seq_no: rawResponse._seq_no, _primary_term: rawResponse._primary_term },
        },
        { migrationVersionCompatibility }
      );
    }),
  };
  return encryptionHelper.optionallyDecryptAndRedactBulkResult(
    result,
    authorizationResult?.typeMap,
    objects
  );
};
