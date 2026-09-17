/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { estypes } from '@elastic/elasticsearch';
import { isNotFoundFromUnsupportedServer } from '@kbn/core-elasticsearch-server-internal';
import {
  type ISavedObjectTypeRegistry,
  type ISavedObjectsSecurityExtension,
  type ISavedObjectsSerializer,
  SavedObjectsErrorHelpers,
  type SavedObjectsRawDoc,
  type SavedObjectsRawDocSource,
} from '@kbn/core-saved-objects-server';
import {
  type SavedObjectsChangeAccessControlResponse,
  type SavedObjectsChangeAccessControlObject,
  type SavedObjectsChangeAccessControlOptions,
  type SavedObjectsChangeAccessControlEntriesOptions,
  type SavedObjectsChangeAccessModeOptions,
  type SavedObjectsChangeOwnershipOptions,
  type SavedObjectAccessControl,
  type Either,
  left,
  right,
  isRight,
  isLeft,
} from '@kbn/core-saved-objects-api-server';
import { prepareSavedObjectAccessControl } from '@kbn/core-saved-objects-utils-server';

import {
  getBulkOperationError,
  getExpectedVersionProperties,
  rawDocExistsInNamespace,
} from '../utils';
import type { ApiExecutionContext } from '../types';
import { type GetBulkOperationErrorRawResponse, isMgetError } from '../utils/internal_utils';

export type ChangeAccessControlActionType =
  | 'changeOwnership'
  | 'changeAccessMode'
  | 'changeAccessControl';

export interface ChangeAccessControlParams {
  registry: ISavedObjectTypeRegistry;
  allowedTypes: string[];
  client: ApiExecutionContext['client'];
  serializer: ISavedObjectsSerializer;
  getIndexForType: (type: string) => string;
  objects: SavedObjectsChangeAccessControlObject[];
  options: SavedObjectsChangeAccessControlOptions;
  securityExtension?: ISavedObjectsSecurityExtension;
  actionType: ChangeAccessControlActionType;
  currentUserProfileUid?: string;
}

/**
 * Validate that user profile IDs have the form `u_<principal>_<version>`
 * We cannot make any assumptions on the shape of principal and version.
 * @param id the userProfileId to validate
 * @returns true if the userProfileId matches the expected format
 */
const isValidUserProfileId = (id: string): boolean => {
  if (!id.startsWith('u_') || id.includes('\n')) {
    return false;
  }
  for (let i = 3; i < id.length - 1; i++) {
    if (id.charAt(i) === '_') return true;
  }
  return false;
};

export const isSavedObjectsChangeAccessModeOptions = (
  options: SavedObjectsChangeAccessControlOptions
): options is SavedObjectsChangeAccessModeOptions => {
  return 'accessMode' in options;
};

export const isSavedObjectsChangeOwnershipOptions = (
  options: SavedObjectsChangeAccessControlOptions
): options is SavedObjectsChangeOwnershipOptions => {
  return 'newOwnerProfileUid' in options;
};

export const isSavedObjectsChangeAccessControlEntriesOptions = (
  options: SavedObjectsChangeAccessControlOptions
): options is SavedObjectsChangeAccessControlEntriesOptions => {
  return 'roles' in options;
};

const VALID_ACCESS_MODES = ['default', 'write_restricted', 'private'] as const;
type AccessMode = (typeof VALID_ACCESS_MODES)[number];

const validateChangeAccessControlParams = ({
  actionType,
  newOwnerProfileUid,
  accessMode,
  objects,
}: {
  actionType: ChangeAccessControlActionType;
  newOwnerProfileUid?: string;
  accessMode?: SavedObjectAccessControl['accessMode'];
  objects: SavedObjectsChangeAccessControlObject[];
}) => {
  if (actionType === 'changeOwnership') {
    if (!newOwnerProfileUid) {
      throw SavedObjectsErrorHelpers.createBadRequestError(
        'The "newOwnerProfileUid" field is required to change ownership of a saved object.'
      );
    }

    if (!isValidUserProfileId(newOwnerProfileUid)) {
      throw SavedObjectsErrorHelpers.createBadRequestError(
        `User profile ID is invalid: expected "u_<principal>_<version>"`
      );
    }
  }
  const changesAccessMode =
    actionType === 'changeAccessMode' || actionType === 'changeAccessControl';
  if (changesAccessMode && accessMode === undefined) {
    throw SavedObjectsErrorHelpers.createBadRequestError(
      'The "accessMode" field is required to change access mode of a saved object.'
    );
  }
  if (
    changesAccessMode &&
    accessMode !== undefined &&
    !VALID_ACCESS_MODES.includes(accessMode as AccessMode)
  ) {
    throw SavedObjectsErrorHelpers.createBadRequestError(
      `When specified, the "accessMode" field can only be one of "${VALID_ACCESS_MODES.join(
        '", "'
      )}".`
    );
  }

  if (!objects || objects.length === 0) {
    throw SavedObjectsErrorHelpers.createBadRequestError(
      `No objects specified for ${
        actionType === 'changeOwnership' ? 'ownership change' : 'access mode change'
      }`
    );
  }
};

export const changeObjectAccessControl = async (
  params: ChangeAccessControlParams
): Promise<SavedObjectsChangeAccessControlResponse> => {
  const { namespace } = params.options;
  const { actionType, currentUserProfileUid } = params;

  // Extract owner for changeOwnership or accessMode for changeAccessMode / changeAccessControl
  const newOwnerProfileUid =
    actionType === 'changeOwnership' && isSavedObjectsChangeOwnershipOptions(params.options)
      ? params.options.newOwnerProfileUid
      : undefined;
  const entriesOptions = isSavedObjectsChangeAccessControlEntriesOptions(params.options)
    ? params.options
    : undefined;
  const accessMode =
    actionType === 'changeAccessControl'
      ? entriesOptions?.accessMode
      : actionType === 'changeAccessMode' && isSavedObjectsChangeAccessModeOptions(params.options)
      ? params.options.accessMode
      : undefined;
  const {
    registry,
    allowedTypes,
    client,
    serializer,
    getIndexForType,
    objects,
    securityExtension,
  } = params;

  /**
   * Clients that exclude the security extension authorize the operation themselves and must pass
   * the owner, because the repository cannot resolve the current user without the extension.
   */
  const isSelfAuthorized = actionType === 'changeAccessControl' && !securityExtension;
  if (!securityExtension && !isSelfAuthorized) {
    throw SavedObjectsErrorHelpers.createBadRequestError(
      'Unable to proceed with changing access control without security extension.'
    );
  }
  if (isSelfAuthorized && !entriesOptions?.owner) {
    throw SavedObjectsErrorHelpers.createBadRequestError(
      'The "owner" field is required when changing access control without security extension.'
    );
  }

  validateChangeAccessControlParams({
    actionType,
    newOwnerProfileUid,
    accessMode,
    objects,
  });

  /**
   * We create a list of expected bulk get results, which will be used to
   * perform the authorization checks and to build the bulk operation request.
   * Valid objects will then be used for rewriting back to the index once authz and access control
   * checks are done and valid.
   */

  const expectedBulkGetResults: Array<
    Either<
      { id: string; type: string; error: any },
      { id: string; type: string; esRequestIndex: number }
    >
  > = objects.map((object, index) => {
    const { type, id } = object;

    if (!allowedTypes.includes(type)) {
      const error = SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
      return left({ id, type, error });
    }
    if (!registry.supportsAccessControl(type)) {
      const error = SavedObjectsErrorHelpers.createBadRequestError(
        `The type ${type} does not support access control`
      );
      return left({ id, type, error });
    }

    return right({
      type,
      id,
      esRequestIndex: index,
    });
  });

  const validObjects = expectedBulkGetResults.filter(isRight);
  if (validObjects.length === 0) {
    // We only have error results; return early to avoid potentially trying authZ checks for 0 types which would result in an exception.
    return {
      objects: expectedBulkGetResults.map(({ value }) => value),
    };
  }

  // Only get the objects that are required for processing
  const bulkGetDocs = validObjects.map<estypes.MgetOperation>((x) => ({
    _id: serializer.generateRawId(undefined, x.value.type, x.value.id),
    _index: getIndexForType(x.value.type),
    _source: ['type', 'namespaces', 'accessControl'],
  }));

  const bulkGetResponse = await client.mget<SavedObjectsRawDocSource>(
    { docs: bulkGetDocs },
    { ignore: [404], meta: true }
  );

  if (
    bulkGetResponse &&
    isNotFoundFromUnsupportedServer({
      statusCode: bulkGetResponse.statusCode,
      headers: bulkGetResponse.headers,
    })
  ) {
    throw SavedObjectsErrorHelpers.createGenericNotFoundEsUnavailableError();
  }

  const authObjects = validObjects.map((element) => {
    const { type, id, esRequestIndex: index } = element.value;

    const preflightResult = bulkGetResponse.body.docs[
      index
    ] as estypes.GetGetResult<SavedObjectsRawDocSource>;

    return {
      type,
      id,
      existingNamespaces: preflightResult?._source?.namespaces ?? [],
      accessControl: preflightResult?._source?.accessControl,
    };
  });

  const authorizationResult = await securityExtension?.authorizeChangeAccessControl(
    {
      namespace,
      objects: authObjects,
    },
    actionType === 'changeAccessControl' ? 'changeAccessMode' : actionType
  );

  const time = new Date().toISOString();
  let bulkOperationRequestIndexCounter = 0;
  const bulkOperationParams: estypes.BulkRequest['operations'] = [];
  const expectedBulkOperationResults: Array<
    Either<
      { id: string; type: string; error: any },
      {
        id: string;
        type: string;
        esRequestIndex: number;
        doc: estypes.GetGetResult<SavedObjectsRawDocSource>;
      }
    >
  > = expectedBulkGetResults.map((expectedBulkGetResult) => {
    if (isLeft(expectedBulkGetResult)) {
      return expectedBulkGetResult;
    }

    const { id, type, esRequestIndex } = expectedBulkGetResult.value;
    const rawDoc = bulkGetResponse!.body.docs[esRequestIndex];

    if (isMgetError(rawDoc) || !rawDoc?.found) {
      const error = SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
      return left({ id, type, error });
    }

    if (!rawDocExistsInNamespace(registry, rawDoc as unknown as SavedObjectsRawDoc, namespace)) {
      const error = SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
      return left({ id, type, error });
    }

    if (
      authorizationResult &&
      authorizationResult.status !== 'fully_authorized' &&
      !authorizationResult.typeMap.has(type)
    ) {
      const error = SavedObjectsErrorHelpers.decorateForbiddenError(
        new Error(
          `User is not authorized to ${
            actionType === 'changeOwnership' ? 'change ownership' : 'change access mode'
          } of type "${type}".`
        )
      );
      return left({ id, type, error });
    }

    const currentSource = rawDoc._source;

    const versionProperties = getExpectedVersionProperties(
      undefined,
      rawDoc as unknown as SavedObjectsRawDoc
    );

    const documentMetadata = {
      _id: serializer.generateRawId(undefined, type, id),
      _index: getIndexForType(type),
      ...versionProperties,
    };

    let documentToSave;
    if (actionType === 'changeOwnership') {
      documentToSave = {
        updated_at: time,
        updated_by: currentUserProfileUid,
        accessControl: {
          ...(currentSource?.accessControl || { accessMode: 'default' }),
          owner: newOwnerProfileUid,
        },
      };
    } else if (actionType === 'changeAccessControl') {
      // The first caller to restrict an object becomes its owner, which allows objects created
      // before the type opted in to access control to be restricted.
      const owner =
        currentSource?.accessControl?.owner ?? entriesOptions!.owner ?? currentUserProfileUid;
      if (!owner) {
        const error = SavedObjectsErrorHelpers.createBadRequestError(
          `Cannot change access control of "${type}:${id}" because Kibana could not determine the owner. Access control requires an identifiable user profile.`
        );
        return left({ id, type, error });
      }

      let accessControl: SavedObjectAccessControl;
      try {
        accessControl = prepareSavedObjectAccessControl({
          accessMode: accessMode ?? 'default',
          entries: entriesOptions!.entries,
          roles: entriesOptions!.roles,
          owner,
          previous: currentSource?.accessControl,
          now: time,
        });
      } catch (validationError) {
        return left({
          id,
          type,
          error: SavedObjectsErrorHelpers.createBadRequestError(validationError.message),
        });
      }

      documentToSave = {
        updated_at: time,
        ...(currentUserProfileUid && { updated_by: currentUserProfileUid }),
        accessControl,
      };
    } else {
      documentToSave = {
        updated_at: time,
        updated_by: currentUserProfileUid,
        accessControl: {
          ...(currentSource?.accessControl || { owner: currentUserProfileUid }),
          accessMode: accessMode ?? 'default',
        },
      };
    }

    bulkOperationParams.push({ update: documentMetadata }, { doc: documentToSave });

    return right({
      type,
      id,
      esRequestIndex: bulkOperationRequestIndexCounter++,
      doc: rawDoc,
    });
  });

  const bulkOperationResponse = bulkOperationParams.length
    ? await client.bulk({
        refresh: 'wait_for',
        operations: bulkOperationParams,
        require_alias: true,
      })
    : undefined;

  return {
    objects: expectedBulkOperationResults.map<{ id: string; type: string; error?: any }>(
      (expectedResult) => {
        if (isLeft(expectedResult)) {
          return expectedResult.value;
        }

        const { type, id, esRequestIndex } = expectedResult.value;
        const response = bulkOperationResponse?.items[esRequestIndex] ?? {};

        const rawResponse = Object.values(
          response
        )[0] as unknown as GetBulkOperationErrorRawResponse;
        const error = getBulkOperationError(type, id, rawResponse);
        if (error) {
          return { id, type, error };
        }

        return { id, type };
      }
    ),
  };
};
