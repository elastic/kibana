/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Payload } from '@hapi/boom';
import { isNotFoundFromUnsupportedServer } from '@kbn/core-elasticsearch-server-internal';
import {
  SavedObjectsErrorHelpers,
  type SavedObject,
  DecoratedError,
  AuthorizeUpdateObject,
  SavedObjectsRawDoc,
  SavedObjectsRawDocSource,
  SavedObjectSanitizedDoc,
  WithAuditName,
} from '@kbn/core-saved-objects-server';
import { ALL_NAMESPACES_STRING, SavedObjectsUtils } from '@kbn/core-saved-objects-utils-server';
import { encodeVersion } from '@kbn/core-saved-objects-base-server-internal';
import {
  SavedObjectsBulkUpdateObject,
  SavedObjectsBulkUpdateOptions,
  SavedObjectsBulkUpdateResponse,
} from '@kbn/core-saved-objects-api-server';
import { DEFAULT_REFRESH_SETTING } from '../constants';
import {
  type Either,
  errorContent,
  getBulkOperationError,
  getCurrentTime,
  getExpectedVersionProperties,
  isMgetDoc,
  left,
  right,
  isLeft,
  isRight,
  rawDocExistsInNamespace,
  getSavedObjectFromSource,
  mergeForUpdate,
} from './utils';
import { ApiExecutionContext } from './types';

export interface PerformUpdateParams<T = unknown> {
  objects: Array<SavedObjectsBulkUpdateObject<T>>;
  options: SavedObjectsBulkUpdateOptions;
}

type DocumentToSave = Record<string, unknown>;
type ExpectedBulkGetResult = Either<
  { type: string; id: string; error: Payload },
  {
    type: string;
    id: string;
    version?: string;
    documentToSave: DocumentToSave;
    objectNamespace?: string;
    esRequestIndex: number;
    migrationVersionCompatibility?: 'raw' | 'compatible';
    mergeAttributes: boolean;
  }
>;

type ExpectedBulkUpdateResult = Either<
  { type: string; id: string; error: Payload },
  {
    type: string;
    id: string;
    namespaces?: string[];
    documentToSave: DocumentToSave;
    esRequestIndex: number;
    rawMigratedUpdatedDoc: SavedObjectsRawDoc;
  }
>;

export const performBulkUpdate = async <T>(
  { objects, options }: PerformUpdateParams<T>,
  { registry, helpers, allowedTypes, client, serializer, extensions = {} }: ApiExecutionContext
): Promise<SavedObjectsBulkUpdateResponse<T>> => {
  const {
    common: commonHelper,
    encryption: encryptionHelper,
    migration: migrationHelper,
    user: userHelper,
  } = helpers;
  const { securityExtension } = extensions;
  const { migrationVersionCompatibility } = options;
  const namespace = commonHelper.getCurrentNamespace(options.namespace);
  const updatedBy = userHelper.getCurrentUserProfileUid();
  const time = getCurrentTime();

  let bulkGetRequestIndexCounter = 0;
  const expectedBulkGetResults = objects.map<ExpectedBulkGetResult>((object) => {
    const {
      type,
      id,
      attributes,
      references,
      version,
      namespace: objectNamespace,
      mergeAttributes = true,
    } = object;
    let error: DecoratedError | undefined;

    if (!allowedTypes.includes(type)) {
      error = SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
    } else {
      try {
        if (objectNamespace === ALL_NAMESPACES_STRING) {
          error = SavedObjectsErrorHelpers.createBadRequestError('"namespace" cannot be "*"');
        }
      } catch (e) {
        error = e;
      }
    }

    if (error) {
      return left({ id, type, error: errorContent(error) });
    }

    const documentToSave = {
      [type]: attributes,
      updated_at: time,
      updated_by: updatedBy,
      ...(Array.isArray(references) && { references }),
    };

    return right({
      type,
      id,
      version,
      documentToSave,
      objectNamespace,
      esRequestIndex: bulkGetRequestIndexCounter++,
      migrationVersionCompatibility,
      mergeAttributes,
    });
  });

  const validObjects = expectedBulkGetResults.filter(isRight);
  if (validObjects.length === 0) {
    return {
      // Technically the returned array should only contain SavedObject results, but for errors this is not true (we cast to 'any' below)
      saved_objects: expectedBulkGetResults.map<SavedObject<T>>(
        ({ value }) => value as unknown as SavedObject<T>
      ),
    };
  }

  // `objectNamespace` is a namespace string, while `namespace` is a namespace ID.
  // The object namespace string, if defined, will supersede the operation's namespace ID.
  const namespaceString = SavedObjectsUtils.namespaceIdToString(namespace);

  const getNamespaceId = (objectNamespace?: string) =>
    objectNamespace !== undefined
      ? SavedObjectsUtils.namespaceStringToId(objectNamespace)
      : namespace;

  const getNamespaceString = (objectNamespace?: string) => objectNamespace ?? namespaceString;

  const bulkGetDocs = validObjects.map(({ value: { type, id, objectNamespace } }) => ({
    _id: serializer.generateRawId(getNamespaceId(objectNamespace), type, id),
    _index: commonHelper.getIndexForType(type),
    _source: true,
  }));

  const bulkGetResponse = bulkGetDocs.length
    ? await client.mget<SavedObjectsRawDocSource>(
        { docs: bulkGetDocs },
        { ignore: [404], meta: true }
      )
    : undefined;
  // fail fast if we can't verify a 404 response is from Elasticsearch
  if (
    bulkGetResponse &&
    isNotFoundFromUnsupportedServer({
      statusCode: bulkGetResponse.statusCode,
      headers: bulkGetResponse.headers,
    })
  ) {
    throw SavedObjectsErrorHelpers.createGenericNotFoundEsUnavailableError();
  }

  const authObjects: Array<WithAuditName<AuthorizeUpdateObject>> = validObjects.map((element) => {
    const { type, id, objectNamespace, esRequestIndex: index, documentToSave } = element.value;
    const preflightResult = bulkGetResponse!.body.docs[index];
    const name = SavedObjectsUtils.getName(registry.getNameAttribute(type), {
      attributes: documentToSave[type] as SavedObject<T>,
    });

    if (registry.isMultiNamespace(type)) {
      return {
        type,
        id,
        objectNamespace,
        name,
        // @ts-expect-error MultiGetHit._source is optional
        existingNamespaces: preflightResult._source?.namespaces ?? [],
      };
    } else {
      return {
        type,
        id,
        objectNamespace,
        name,
        existingNamespaces: [],
      };
    }
  });

  const authorizationResult = await securityExtension?.authorizeBulkUpdate({
    namespace,
    objects: authObjects,
  });

  let bulkUpdateRequestIndexCounter = 0;
  const bulkUpdateParams: object[] = [];

  const expectedBulkUpdateResults = await Promise.all(
    expectedBulkGetResults.map<Promise<ExpectedBulkUpdateResult>>(async (expectedBulkGetResult) => {
      if (isLeft(expectedBulkGetResult)) {
        return expectedBulkGetResult;
      }

      const {
        esRequestIndex,
        id,
        type,
        version,
        documentToSave,
        objectNamespace,
        mergeAttributes,
      } = expectedBulkGetResult.value;

      let namespaces: string[] | undefined;
      const versionProperties = getExpectedVersionProperties(version);
      const indexFound = bulkGetResponse?.statusCode !== 404;
      const actualResult = indexFound ? bulkGetResponse?.body.docs[esRequestIndex] : undefined;
      const docFound = indexFound && isMgetDoc(actualResult) && actualResult.found;
      const isMultiNS = registry.isMultiNamespace(type);

      if (
        !docFound ||
        (isMultiNS &&
          !rawDocExistsInNamespace(
            registry,
            actualResult as SavedObjectsRawDoc,
            getNamespaceId(objectNamespace)
          ))
      ) {
        return left({
          id,
          type,
          error: errorContent(SavedObjectsErrorHelpers.createGenericNotFoundError(type, id)),
        });
      }

      if (isMultiNS) {
        // @ts-expect-error MultiGetHit is incorrectly missing _id, _source
        namespaces = actualResult!._source.namespaces ?? [
          // @ts-expect-error MultiGetHit is incorrectly missing _id, _source
          SavedObjectsUtils.namespaceIdToString(actualResult!._source.namespace),
        ];
      } else if (registry.isSingleNamespace(type)) {
        // if `objectNamespace` is undefined, fall back to `options.namespace`
        namespaces = [getNamespaceString(objectNamespace)];
      }

      const document = getSavedObjectFromSource<T>(
        registry,
        type,
        id,
        actualResult as SavedObjectsRawDoc,
        { migrationVersionCompatibility }
      );

      let migrated: SavedObject<T>;
      try {
        migrated = migrationHelper.migrateStorageDocument(document) as SavedObject<T>;
      } catch (migrateStorageDocError) {
        throw SavedObjectsErrorHelpers.decorateGeneralError(
          migrateStorageDocError,
          'Failed to migrate document to the latest version.'
        );
      }

      const typeDefinition = registry.getType(type)!;

      const encryptedUpdatedAttributes = await encryptionHelper.optionallyEncryptAttributes(
        type,
        id,
        objectNamespace || namespace,
        documentToSave[type]
      );

      const updatedAttributes = mergeAttributes
        ? mergeForUpdate({
            targetAttributes: {
              ...(migrated!.attributes as Record<string, unknown>),
            },
            updatedAttributes: encryptedUpdatedAttributes,
            typeMappings: typeDefinition.mappings,
          })
        : encryptedUpdatedAttributes;

      const migratedUpdatedSavedObjectDoc = migrationHelper.migrateInputDocument({
        ...migrated!,
        id,
        type,
        namespace,
        namespaces,
        attributes: updatedAttributes,
        updated_at: time,
        updated_by: updatedBy,
        ...(Array.isArray(documentToSave.references) && { references: documentToSave.references }),
      });
      const updatedMigratedDocumentToSave = serializer.savedObjectToRaw(
        migratedUpdatedSavedObjectDoc as SavedObjectSanitizedDoc
      );

      const expectedResult = {
        type,
        id,
        namespaces,
        esRequestIndex: bulkUpdateRequestIndexCounter++,
        documentToSave: expectedBulkGetResult.value.documentToSave,
        rawMigratedUpdatedDoc: updatedMigratedDocumentToSave,
        migrationVersionCompatibility,
      };

      bulkUpdateParams.push(
        {
          index: {
            _id: serializer.generateRawId(getNamespaceId(objectNamespace), type, id),
            _index: commonHelper.getIndexForType(type),
            ...versionProperties,
          },
        },
        updatedMigratedDocumentToSave._source
      );

      return right(expectedResult);
    })
  );

  const { refresh = DEFAULT_REFRESH_SETTING } = options;
  const bulkUpdateResponse = bulkUpdateParams.length
    ? await client.bulk({
        refresh,
        operations: bulkUpdateParams,
        _source_includes: ['originId'],
        require_alias: true,
      })
    : undefined;

  const result = {
    saved_objects: expectedBulkUpdateResults.map((expectedResult) => {
      if (isLeft(expectedResult)) {
        return expectedResult.value as any;
      }

      const { type, id, namespaces, documentToSave, esRequestIndex, rawMigratedUpdatedDoc } =
        expectedResult.value;
      const response = bulkUpdateResponse?.items[esRequestIndex] ?? {};
      const rawResponse = Object.values(response)[0] as any;

      const error = getBulkOperationError(type, id, rawResponse);
      if (error) {
        return { type, id, error };
      }

      const { _seq_no: seqNo, _primary_term: primaryTerm } = rawResponse;

      // eslint-disable-next-line @typescript-eslint/naming-convention
      const { [type]: attributes, references, updated_at, updated_by } = documentToSave;

      const { originId } = rawMigratedUpdatedDoc._source;
      return {
        id,
        type,
        ...(namespaces && { namespaces }),
        ...(originId && { originId }),
        updated_at,
        updated_by,
        version: encodeVersion(seqNo, primaryTerm),
        attributes,
        references,
      };
    }),
  };

  return encryptionHelper.optionallyDecryptAndRedactBulkResult(
    result,
    authorizationResult?.typeMap,
    objects
  );
};
