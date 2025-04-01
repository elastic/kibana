/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import pMap from 'p-map';
import {
  AuthorizeUpdateObject,
  SavedObjectsErrorHelpers,
  ISavedObjectTypeRegistry,
  SavedObjectsRawDoc,
  ISavedObjectsSecurityExtension,
} from '@kbn/core-saved-objects-server';
import { ALL_NAMESPACES_STRING, SavedObjectsUtils } from '@kbn/core-saved-objects-utils-server';
import {
  SavedObjectsBulkDeleteObject,
  SavedObjectsBulkDeleteOptions,
  SavedObjectsBulkDeleteResponse,
} from '@kbn/core-saved-objects-api-server';
import { DEFAULT_REFRESH_SETTING, MAX_CONCURRENT_ALIAS_DELETIONS } from '../constants';
import {
  errorContent,
  getBulkOperationError,
  getExpectedVersionProperties,
  isLeft,
  isMgetDoc,
  rawDocExistsInNamespace,
  isRight,
  left,
  right,
} from './utils';
import type { ApiExecutionContext } from './types';
import { deleteLegacyUrlAliases } from './internals/delete_legacy_url_aliases';
import type {
  BulkDeleteExpectedBulkGetResult,
  BulkDeleteItemErrorResult,
  BulkDeleteParams,
  ExpectedBulkDeleteMultiNamespaceDocsParams,
  ExpectedBulkDeleteResult,
  NewBulkItemResponse,
  ObjectToDeleteAliasesFor,
} from './internals/repository_bulk_delete_internal_types';

export interface PerformBulkDeleteParams<T = unknown> {
  objects: SavedObjectsBulkDeleteObject[];
  options: SavedObjectsBulkDeleteOptions;
}

export const performBulkDelete = async <T>(
  { objects, options }: PerformBulkDeleteParams<T>,
  {
    registry,
    helpers,
    allowedTypes,
    client,
    serializer,
    extensions = {},
    logger,
    mappings,
  }: ApiExecutionContext
): Promise<SavedObjectsBulkDeleteResponse> => {
  const { common: commonHelper, preflight: preflightHelper } = helpers;
  const { securityExtension } = extensions;

  const { refresh = DEFAULT_REFRESH_SETTING, force } = options;
  const namespace = commonHelper.getCurrentNamespace(options.namespace);

  const expectedBulkGetResults = presortObjectsByNamespaceType(
    objects,
    allowedTypes,
    registry,
    securityExtension
  );
  if (expectedBulkGetResults.length === 0) {
    return { statuses: [] };
  }

  const multiNamespaceDocsResponse = await preflightHelper.preflightCheckForBulkDelete({
    expectedBulkGetResults,
    namespace,
  });

  // First round of filtering (Left: object doesn't exist/doesn't exist in namespace, Right: good to proceed)
  const expectedBulkDeleteMultiNamespaceDocsResults =
    getExpectedBulkDeleteMultiNamespaceDocsResults(
      {
        expectedBulkGetResults,
        multiNamespaceDocsResponse,
        namespace,
        force,
      },
      registry
    );

  if (securityExtension) {
    // Perform Auth Check (on both L/R, we'll deal with that later)
    const authObjects: AuthorizeUpdateObject[] = expectedBulkDeleteMultiNamespaceDocsResults.map(
      (element) => {
        const index = (element.value as { esRequestIndex: number }).esRequestIndex;
        const { type, id } = element.value;
        const preflightResult =
          index !== undefined ? multiNamespaceDocsResponse?.body.docs[index] : undefined;

        const name = preflightResult
          ? SavedObjectsUtils.getName(
              registry.getNameAttribute(type),
              // @ts-expect-error MultiGetHit._source is optional
              { attributes: preflightResult?._source?.[type] }
            )
          : undefined;

        return {
          type,
          id,
          name,
          // @ts-expect-error MultiGetHit._source is optional
          existingNamespaces: preflightResult?._source?.namespaces ?? [],
        };
      }
    );

    await securityExtension.authorizeBulkDelete({ namespace, objects: authObjects });
  }

  // Filter valid objects
  const validObjects = expectedBulkDeleteMultiNamespaceDocsResults.filter(isRight);
  if (validObjects.length === 0) {
    // We only have error results; return early to avoid potentially trying authZ checks for 0 types which would result in an exception.
    const savedObjects = expectedBulkDeleteMultiNamespaceDocsResults
      .filter(isLeft)
      .map((expectedResult) => {
        return { ...expectedResult.value, success: false };
      });
    return { statuses: [...savedObjects] };
  }

  // Create the bulkDeleteParams
  const bulkDeleteParams: BulkDeleteParams[] = [];
  validObjects.map((expectedResult) => {
    bulkDeleteParams.push({
      delete: {
        _id: serializer.generateRawId(
          namespace,
          expectedResult.value.type,
          expectedResult.value.id
        ),
        _index: commonHelper.getIndexForType(expectedResult.value.type),
        ...getExpectedVersionProperties(undefined),
      },
    });
  });

  const bulkDeleteResponse = bulkDeleteParams.length
    ? await client.bulk({
        refresh,
        operations: bulkDeleteParams,
        require_alias: true,
      })
    : undefined;

  // extracted to ensure consistency in the error results returned
  let errorResult: BulkDeleteItemErrorResult;
  const objectsToDeleteAliasesFor: ObjectToDeleteAliasesFor[] = [];

  const savedObjects = expectedBulkDeleteMultiNamespaceDocsResults.map((expectedResult) => {
    if (isLeft(expectedResult)) {
      return { ...expectedResult.value, success: false };
    }
    const { type, id, namespaces, esRequestIndex: esBulkDeleteRequestIndex } = expectedResult.value;
    // we assume this wouldn't happen but is needed to ensure type consistency
    if (bulkDeleteResponse === undefined) {
      throw new Error(
        `Unexpected error in bulkDelete saved objects: bulkDeleteResponse is undefined`
      );
    }
    const rawResponse = Object.values(
      bulkDeleteResponse.items[esBulkDeleteRequestIndex]
    )[0] as NewBulkItemResponse;

    const error = getBulkOperationError(type, id, rawResponse);
    if (error) {
      errorResult = { success: false, type, id, error };
      return errorResult;
    }
    if (rawResponse.result === 'not_found') {
      errorResult = {
        success: false,
        type,
        id,
        error: errorContent(SavedObjectsErrorHelpers.createGenericNotFoundError(type, id)),
      };
      return errorResult;
    }

    if (rawResponse.result === 'deleted') {
      // `namespaces` should only exist in the expectedResult.value if the type is multi-namespace.
      if (namespaces) {
        objectsToDeleteAliasesFor.push({
          type,
          id,
          ...(namespaces.includes(ALL_NAMESPACES_STRING)
            ? { namespaces: [], deleteBehavior: 'exclusive' }
            : { namespaces, deleteBehavior: 'inclusive' }),
        });
      }
    }
    const successfulResult = {
      success: true,
      id,
      type,
    };
    return successfulResult;
  });

  // Delete aliases if necessary, ensuring we don't have too many concurrent operations running.
  const mapper = async ({ type, id, namespaces, deleteBehavior }: ObjectToDeleteAliasesFor) => {
    await deleteLegacyUrlAliases({
      mappings,
      registry,
      client,
      getIndexForType: commonHelper.getIndexForType.bind(commonHelper),
      type,
      id,
      namespaces,
      deleteBehavior,
    }).catch((err) => {
      logger.error(`Unable to delete aliases when deleting an object: ${err.message}`);
    });
  };
  await pMap(objectsToDeleteAliasesFor, mapper, { concurrency: MAX_CONCURRENT_ALIAS_DELETIONS });

  return { statuses: [...savedObjects] };
};

/**
 * Performs initial checks on object type validity and flags multi-namespace objects for preflight checks by adding an `esRequestIndex`
 * @returns array BulkDeleteExpectedBulkGetResult[]
 */
function presortObjectsByNamespaceType(
  objects: SavedObjectsBulkDeleteObject[],
  allowedTypes: string[],
  registry: ISavedObjectTypeRegistry,
  securityExtension?: ISavedObjectsSecurityExtension
) {
  let bulkGetRequestIndexCounter = 0;
  return objects.map<BulkDeleteExpectedBulkGetResult>((object) => {
    const { type, id } = object;
    if (!allowedTypes.includes(type)) {
      return left({
        id,
        type,
        error: errorContent(SavedObjectsErrorHelpers.createUnsupportedTypeError(type)),
      });
    }
    const requiresNamespacesCheck = registry.isMultiNamespace(type);

    return right({
      type,
      id,
      fields: securityExtension?.includeSavedObjectNames()
        ? SavedObjectsUtils.getIncludedNameFields(type, registry.getNameAttribute(type))
        : [],
      ...(requiresNamespacesCheck && { esRequestIndex: bulkGetRequestIndexCounter++ }),
    });
  });
}

/**
 * @returns array of objects sorted by expected delete success or failure result
 * @internal
 */
function getExpectedBulkDeleteMultiNamespaceDocsResults(
  params: ExpectedBulkDeleteMultiNamespaceDocsParams,
  registry: ISavedObjectTypeRegistry
): ExpectedBulkDeleteResult[] {
  const { expectedBulkGetResults, multiNamespaceDocsResponse, namespace, force } = params;
  let indexCounter = 0;
  const expectedBulkDeleteMultiNamespaceDocsResults =
    expectedBulkGetResults.map<ExpectedBulkDeleteResult>((expectedBulkGetResult) => {
      if (isLeft(expectedBulkGetResult)) {
        return { ...expectedBulkGetResult };
      }
      const { esRequestIndex: esBulkGetRequestIndex, id, type } = expectedBulkGetResult.value;

      let namespaces;

      if (esBulkGetRequestIndex !== undefined) {
        const indexFound = multiNamespaceDocsResponse?.statusCode !== 404;

        const actualResult = indexFound
          ? multiNamespaceDocsResponse?.body.docs[esBulkGetRequestIndex]
          : undefined;

        const docFound = indexFound && isMgetDoc(actualResult) && actualResult.found;

        // return an error if the doc isn't found at all or the doc doesn't exist in the namespaces
        if (!docFound) {
          return left({
            id,
            type,
            error: errorContent(SavedObjectsErrorHelpers.createGenericNotFoundError(type, id)),
          });
        }
        // the following check should be redundant since we're retrieving the docs from elasticsearch but we check just to make sure
        if (!rawDocExistsInNamespace(registry, actualResult as SavedObjectsRawDoc, namespace)) {
          return left({
            id,
            type,
            error: errorContent(SavedObjectsErrorHelpers.createGenericNotFoundError(type, id)),
          });
        }
        // @ts-expect-error MultiGetHit is incorrectly missing _id, _source
        namespaces = actualResult!._source.namespaces ?? [
          SavedObjectsUtils.namespaceIdToString(namespace),
        ];
        const useForce = force && force === true;
        // the document is shared to more than one space and can only be deleted by force.
        if (!useForce && (namespaces.length > 1 || namespaces.includes(ALL_NAMESPACES_STRING))) {
          return left({
            success: false,
            id,
            type,
            error: errorContent(
              SavedObjectsErrorHelpers.createBadRequestError(
                'Unable to delete saved object that exists in multiple namespaces, use the `force` option to delete it anyway'
              )
            ),
          });
        }
      }
      // contains all objects that passed initial preflight checks, including single namespace objects that skipped the mget call
      // single namespace objects will have namespaces:undefined
      const expectedResult = {
        type,
        id,
        namespaces,
        esRequestIndex: indexCounter++,
      };

      return right(expectedResult);
    });
  return expectedBulkDeleteMultiNamespaceDocsResults;
}
