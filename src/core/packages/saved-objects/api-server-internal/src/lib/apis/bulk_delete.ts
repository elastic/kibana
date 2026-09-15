/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import pMap from 'p-map';
import type {
  AuthorizeUpdateObject,
  ISavedObjectTypeRegistry,
  SavedObjectsRawDoc,
  ISavedObjectsSecurityExtension,
} from '@kbn/core-saved-objects-server';
import { SavedObjectsErrorHelpers, errorContent } from '@kbn/core-saved-objects-server';
import { ALL_NAMESPACES_STRING, SavedObjectsUtils } from '@kbn/core-saved-objects-utils-server';
import {
  isLeft,
  isRight,
  left,
  right,
  type SavedObjectsBulkDeleteObject,
  type SavedObjectsBulkDeleteOptions,
  type SavedObjectsBulkDeleteResponse,
} from '@kbn/core-saved-objects-api-server';
import { DEFAULT_REFRESH_SETTING, MAX_CONCURRENT_ALIAS_DELETIONS } from '../constants';
import {
  getBulkOperationError,
  getExpectedVersionProperties,
  isMgetDoc,
  rawDocExistsInNamespace,
} from './utils';
import type {
  WriteAuditRecord,
  SavedObjectAuditDiffRecorder,
} from './utils/saved_object_audit_diff_recorder';
import {
  applyBeforeAttrsFromMgetDocs,
  fetchBeforeAttrs,
  type BeforeAttrsRequest,
} from './utils/saved_object_diff_before_state';
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
  auditDiffRecorder?: SavedObjectAuditDiffRecorder;
}

export const performBulkDelete = async <T>(
  { objects, options, auditDiffRecorder }: PerformBulkDeleteParams<T>,
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
    securityExtension,
    auditDiffRecorder
  );
  if (expectedBulkGetResults.length === 0) {
    return { statuses: [] };
  }

  const multiNamespaceDocsResponse = await preflightHelper.preflightCheckForBulkDelete({
    expectedBulkGetResults,
    namespace,
  });

  // First round of filtering (Left: object doesn't exist/doesn't exist in namespace, Right: good to proceed)
  const expectedMultiNamespaceResults = getExpectedBulkDeleteMultiNamespaceDocsResults(
    {
      expectedBulkGetResults,
      multiNamespaceDocsResponse,
      namespace,
      force,
    },
    registry
  );

  let expectedResults: ExpectedBulkDeleteResult[];
  // Reused below for audit names (resolved from the preflight for multi-namespace types).
  let authObjects: AuthorizeUpdateObject[] = [];

  if (securityExtension) {
    // Perform Auth Check (on both L/R, we'll deal with that later)
    authObjects = expectedMultiNamespaceResults.map((element) => {
      const index = (element.value as { esRequestIndex: number }).esRequestIndex;
      const { type, id } = element.value;
      const preflightResult =
        index !== undefined ? multiNamespaceDocsResponse?.body.docs[index] : undefined;

      // @ts-expect-error MultiGetHit._source is optional
      const accessControl = preflightResult?._source?.accessControl;
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
        ...(accessControl ? { accessControl } : {}),
        // @ts-expect-error MultiGetHit._source is optional
        existingNamespaces: preflightResult?._source?.namespaces ?? [],
      };
    });

    const authorizationResult = await securityExtension.authorizeBulkDelete({
      namespace,
      objects: authObjects,
    });

    const inaccessibleObjects = authorizationResult?.inaccessibleObjects
      ? Array.from(authorizationResult.inaccessibleObjects)
      : [];

    expectedResults = await securityExtension.filterInaccessibleObjectsForBulkAction(
      expectedMultiNamespaceResults,
      inaccessibleObjects,
      'bulk_delete',
      true // reindex of esRequestIndex field needed to map subsequent bulk delete results below
    );
  } else expectedResults = expectedMultiNamespaceResults;

  // Track each authorized object for auditing (flushed by the repository once the
  // operation settles); bulk delete authorizes both valid and already-errored objects.
  // `before` is populated by the feature-gated pre-delete fetch; empty attributes
  // still audit — the delete itself is the audit signal.
  // Indexed by request position so duplicate `{type, id}` entries each get their own event.
  const auditRecords: Array<WriteAuditRecord | undefined> = [];
  if (auditDiffRecorder) {
    expectedResults.forEach(({ value }, index) => {
      if (value.id) {
        auditRecords[index] = auditDiffRecorder.track(
          { type: value.type, id: value.id, name: authObjects[index]?.name },
          { key: String(index) }
        );
      }
    });
  }

  // Filter valid objects
  const validObjects = expectedResults.filter(isRight);
  if (validObjects.length === 0) {
    // We only have error results; return early.
    const savedObjects = expectedResults.map((expectedResult) => {
      return { ...expectedResult.value, success: false };
    });
    return { statuses: [...savedObjects] };
  }

  // Capture pre-delete attributes for the diff audit event (feature-gated).
  // Multi-namespace objects already went through a preflight mget; when the
  // type is allow-listed that request also pulls attributes, so we reuse it
  // instead of a second round-trip. Single-namespace objects have no preflight,
  // so they still need a dedicated mget. Results are matched by `_id` (not
  // array position). Failure-isolated: an mget error must not fail the delete.
  if (auditDiffRecorder) {
    try {
      const toBeforeRequests = (multiNamespace: boolean): BeforeAttrsRequest[] =>
        expectedResults.flatMap((expectedResult, index) => {
          if (isLeft(expectedResult)) {
            return [];
          }
          const { type, id } = expectedResult.value;
          if (
            registry.isMultiNamespace(type) !== multiNamespace ||
            !auditDiffRecorder.shouldComputeDiff(type)
          ) {
            return [];
          }
          return [
            {
              rawId: serializer.generateRawId(namespace, type, id),
              type,
              auditRecord: auditRecords[index],
            },
          ];
        });

      applyBeforeAttrsFromMgetDocs(multiNamespaceDocsResponse?.body.docs, toBeforeRequests(true));

      await fetchBeforeAttrs({
        client,
        getIndexForType: (objectType) => commonHelper.getIndexForType(objectType),
        requests: toBeforeRequests(false),
      });
    } catch (error) {
      logger.error(
        `Failed to fetch before-state for saved object diff on bulk delete: ${String(error)}`
      );
    }
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

  const savedObjects = expectedResults.map((expectedResult, index) => {
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
      auditRecords[index]?.succeed();

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
  securityExtension?: ISavedObjectsSecurityExtension,
  auditDiffRecorder?: SavedObjectAuditDiffRecorder
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
    const nameFields = securityExtension?.includeSavedObjectNames()
      ? SavedObjectsUtils.getIncludedNameFields(type, registry.getNameAttribute(type))
      : [];
    // Widen the preflight `_source` so allow-listed multi-namespace objects
    // already have attributes for the diff — no second mget for those types.
    const diffFields =
      requiresNamespacesCheck && auditDiffRecorder?.shouldComputeDiff(type) ? [type] : [];

    return right({
      type,
      id,
      fields: [...nameFields, ...diffFields],
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
      const {
        esRequestIndex: esBulkGetRequestIndex,
        id,
        type,
        accessControl,
      } = expectedBulkGetResult.value;

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
        ...(accessControl ? { accessControl } : {}),
        esRequestIndex: indexCounter++,
      };

      return right(expectedResult);
    });
  return expectedBulkDeleteMultiNamespaceDocsResults;
}
