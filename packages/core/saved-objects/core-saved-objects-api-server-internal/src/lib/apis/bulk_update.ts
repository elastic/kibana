/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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

export const performBulkUpdate = async <T>(
  { objects, options }: PerformUpdateParams<T>,
  { registry, helpers, allowedTypes, client, serializer, extensions = {} }: ApiExecutionContext
): Promise<SavedObjectsBulkUpdateResponse<T>> => {
  const {
    common: commonHelper,
    encryption: encryptionHelper,
    migration: migrationHelper,
  } = helpers;
  const { securityExtension } = extensions;

  // console.log('the objects we are testing in unit test for errors:', JSON.stringify(objects));

  const namespace = commonHelper.getCurrentNamespace(options.namespace);
  const time = getCurrentTime();

  let bulkGetRequestIndexCounter = 0;
  type DocumentToSave = Record<string, unknown>;
  type ExpectedBulkGetResult = Either<
    { type: string; id: string; error: Payload },
    {
      type: string;
      id: string;
      version?: string;
      documentToSave: DocumentToSave;
      objectNamespace?: string;
      esRequestIndex?: number;
      migrationVersionCompatibility?: 'raw' | 'compatible';
    }
  >;
  // get all docs from ES -> once we have them, we're pretty much in a similar flow as
  // bulkCreate when requestId !== undefined && overwrite === true

  // maps to expectedResults in bulkCreate
  const expectedBulkGetResults = objects.map<ExpectedBulkGetResult>((object) => {
    const {
      type,
      id,
      attributes,
      references,
      version,
      namespace: objectNamespace,
      migrationVersionCompatibility,
    } = object;
    let error: DecoratedError | undefined;
    // console.log(
    //   `expectedBulkGetResults should return error as result for object that has "*" as namespace', type: ${type}, objectNamespace: ${objectNamespace}`
    // );
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
      ...(Array.isArray(references) && { references }),
    };

    // const requiresNamespacesCheck = registry.isMultiNamespace(object.type);

    return right({
      type,
      id,
      version,
      documentToSave,
      objectNamespace,
      esRequestIndex: bulkGetRequestIndexCounter++,
      migrationVersionCompatibility,
    });
  });
  // maps to validObjects in bulkCreate
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

  // `objectNamespace` is a namespace string, while `namespace` is a namespace ID.
  // The object namespace string, if defined, will supersede the operation's namespace ID.
  const namespaceString = SavedObjectsUtils.namespaceIdToString(namespace);

  const getNamespaceId = (objectNamespace?: string) =>
    objectNamespace !== undefined
      ? SavedObjectsUtils.namespaceStringToId(objectNamespace)
      : namespace;

  const getNamespaceString = (objectNamespace?: string) => objectNamespace ?? namespaceString;
  // bulkGetDocs maps to preflightCheckObjects in bulkCreate
  // bulkCreate uses bulkGetObjectsAndAliases to mget them
  // here we're only interested in the objects themselves
  const bulkGetDocs = validObjects
    .filter(({ value }) => value.esRequestIndex !== undefined) // line 136 in bulk_create
    .map(({ value: { type, id, objectNamespace } }) => ({
      _id: serializer.generateRawId(getNamespaceId(objectNamespace), type, id),
      _index: commonHelper.getIndexForType(type),
      // _source: true,
      _source: ['type', 'namespaces'],
    }));
  // bulkGetResponse maps to preflightCheckResponse in bulkCreate
  const bulkGetResponse = bulkGetDocs.length
    ? await client.mget<SavedObjectsRawDocSource>(
        { body: { docs: bulkGetDocs } },
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
  // we need to still check auth for bulkUpdate a doc, regardless of using a different esClient API
  const authObjects: AuthorizeUpdateObject[] = validObjects.map((element) => {
    let result;
    const { type, id, objectNamespace, esRequestIndex: index } = element.value;

    const preflightResult = index !== undefined ? bulkGetResponse?.body?.docs[index] : undefined;
    if (registry.isMultiNamespace(type)) {
      result = {
        type,
        id,
        objectNamespace, // the namespace as defined per object in params.objects
        // @ts-expect-error MultiGetHit._source is optional
        existingNamespaces: preflightResult?._source?.namespaces ?? [], // we only have _source.namespaces for multi-namespace objects.
      };
    } else {
      result = {
        type,
        id,
        objectNamespace,
        existingNamespaces: [], // we only have _source.namespaces for multi-namespace objects.
      };
    }
    return result;
  });

  const authorizationResult = await securityExtension?.authorizeBulkUpdate({
    namespace,
    objects: authObjects,
  });

  let bulkUpdateRequestIndexCounter = 0;
  const bulkUpdateParams: object[] = [];

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
        migrationVersionCompatibility,
      } = expectedBulkGetResult.value;

      let namespaces: string[] | undefined;
      let versionProperties;
      const indexFound = bulkGetResponse?.statusCode !== 404;
      const actualResult =
        indexFound && esRequestIndex !== undefined
          ? bulkGetResponse?.body.docs[esRequestIndex]
          : undefined;
      const docFound =
        indexFound && esRequestIndex !== undefined && isMgetDoc(actualResult) && actualResult.found;
      if (registry.isMultiNamespace(type)) {
        // esRequestIndex will be undefined for invalid types. we assign an esReqeustIndex to all docs, regardless of namespace type and can't use it as an indicator for a multinamespace object type.
        if (
          !docFound ||
          !rawDocExistsInNamespace(
            registry,
            actualResult as SavedObjectsRawDoc,
            getNamespaceId(objectNamespace)
          )
        ) {
          return left({
            id,
            type,
            error: errorContent(SavedObjectsErrorHelpers.createGenericNotFoundError(type, id)),
          });
        }
        // @ts-expect-error MultiGetHit is incorrectly missing _id, _source
        namespaces = actualResult!._source.namespaces ?? [
          // @ts-expect-error MultiGetHit is incorrectly missing _id, _source
          SavedObjectsUtils.namespaceIdToString(actualResult!._source.namespace),
        ];
        versionProperties = getExpectedVersionProperties(version);
      } else {
        if (!docFound) {
          return left({
            id,
            type,
            error: errorContent(SavedObjectsErrorHelpers.createGenericNotFoundError(type, id)),
          });
        }
        if (registry.isSingleNamespace(type)) {
          // if `objectNamespace` is undefined, fall back to `options.namespace`
          namespaces = [getNamespaceString(objectNamespace)];
        }
        versionProperties = getExpectedVersionProperties(version);
      }

      const expectedResult = {
        type,
        id,
        namespaces,
        esRequestIndex: bulkUpdateRequestIndexCounter++,
        documentToSave: expectedBulkGetResult.value.documentToSave,
        rawMigratedUpdatedDoc: {} as SavedObjectsRawDoc,
        migrationVersionCompatibility,
      };
      let migrated: SavedObject<T>;
      const typeDefinition = registry.getType(type)!;

      if (docFound) {
        // actualResult could be undefined
        const document = getSavedObjectFromSource<T>(
          registry,
          type,
          id,
          actualResult as SavedObjectsRawDoc,
          { migrationVersionCompatibility }
        );

        try {
          migrated = migrationHelper.migrateStorageDocument(document) as SavedObject<T>;
        } catch (migrateStorageDocError) {
          throw SavedObjectsErrorHelpers.decorateGeneralError(
            migrateStorageDocError,
            'Failed to migrate document to the latest version.'
          );
        }
      }

      const updatedAttributes = mergeForUpdate({
        targetAttributes: {
          ...migrated!.attributes,
        },
        updatedAttributes: await encryptionHelper.optionallyEncryptAttributes(
          type,
          id,
          namespace,
          documentToSave[type]
        ),
        typeMappings: typeDefinition.mappings,
      });

      const migratedUpdatedSavedObjectDoc = migrationHelper.migrateInputDocument({
        ...migrated!,
        id,
        type,
        namespace,
        namespaces,
        attributes: updatedAttributes,
        updated_at: time,
        ...(Array.isArray(documentToSave.references) && { references: documentToSave.references }),
      });

      const updatedMigratedDocumentToSave = serializer.savedObjectToRaw(
        migratedUpdatedSavedObjectDoc as SavedObjectSanitizedDoc
      );
      expectedResult.rawMigratedUpdatedDoc = updatedMigratedDocumentToSave;

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
        body: bulkUpdateParams,
        _source_includes: ['originId'], // originId can only be defined for multi-namespace object types
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
      const { [type]: attributes, references, updated_at } = documentToSave; // use the original request params ?? probably need to return the actual updated doc that exists in es now.

      const { originId } = rawMigratedUpdatedDoc._source;
      console.log('in actual API, do we have an originId?', originId);
      // @TINA TODO: ensure we return the correct response without changing the signature
      const intermediateResult = {
        id,
        type,
        ...(namespaces && { namespaces }),
        ...(originId && { originId }),
        updated_at,
        version: encodeVersion(seqNo, primaryTerm),
        attributes,
        references,
      };
      console.log('In actual API, intermediateResult:', JSON.stringify(intermediateResult));
      return intermediateResult;
    }),
  };

  return encryptionHelper.optionallyDecryptAndRedactBulkResult(
    result,
    authorizationResult?.typeMap,
    objects
  );
};
