/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectsErrorHelpers, DecoratedError } from '@kbn/core-saved-objects-server';
import { Logger } from 'elastic-apm-node';
import {
  PreflightCheckNamespacesForUpdateResult,
  PreflightGetDocForUpdateResult,
} from '../apis/helpers';

/**
 * Downward compatible update control flow helpers
 */

export const updateProgressData: Record<string, unknown> = {
  unmigratedRawDoc: {},
  migratedOriginalSODoc: {},
  updatedNewSODoc: {},
  safeToSendUpdatedNewSODoc: {},
  updateResult: {},
  retriesCount: 0,
  safeToSendCreateUpsertSODoc: {},
  createdResult: {},
  finalResponse: {},
};

export const isValidRequest = ({
  allowedTypes,
  type,
  id,
}: {
  allowedTypes: string[];
  type: string;
  id?: string;
}) => {
  return !id
    ? {
        validRequest: false,
        error: SavedObjectsErrorHelpers.createBadRequestError('id cannot be empty'),
      }
    : !allowedTypes.includes(type)
    ? {
        validRequest: false,
        error: SavedObjectsErrorHelpers.createGenericNotFoundError(type, id),
      }
    : {
        validRequest: true,
      };
};

export interface UpdateErrorMap<E = DecoratedError | Error | unknown> {
  errorType: string;
  error: E;
}

/**
 * Collects to throw as they generate
 * Strictly speaking, we should be throwing as early as possible.
 * @param logger
 * @param errorType
 * @param error
 * @returns error
 */
export function errorMap(
  logger: Logger,
  errorType: string,
  error: DecoratedError | Error,
  type?: string,
  id?: string
) {
  let errorToReturn: DecoratedError | Error;
  switch (errorType) {
    case 'bad request':
      logger.info(`Cannot perform update request`);
      errorToReturn = error;
      break;
    case 'saved object not found':
      logger.info(`Saved object not found, ${error}`);
      errorToReturn = SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
      break;
    case 'saved object migrateStorageDocument error':
      logger.info(`Saved object migrateStorageDocument, ${error}`);
      errorToReturn = SavedObjectsErrorHelpers.decorateGeneralError(
        error,
        'Failed to migrate document to the latest version.'
      );
    default:
      errorToReturn = new Error('unknown error', error);
  }
  return errorToReturn;
}

export interface CanPerformUpdateParams<T = unknown> {
  logger: Logger;
  type: string;
  id: string;
  namespace?: string;
  upsert: T | undefined;
  preflightCheckNamespacesForUpdateResult: PreflightCheckNamespacesForUpdateResult;
  preflightGetDocForUpdateResult: PreflightGetDocForUpdateResult;
}
export const canPerformUpdate = (params: CanPerformUpdateParams) => {
  const {
    upsert,
    type,
    id,
    preflightCheckNamespacesForUpdateResult: namespaceResult,
    preflightGetDocForUpdateResult: getResult,
    logger,
  } = params;
  // validating if an update (directly update or create the object instead) can be done, based on if the doc exists or not
  // extract into canUpdate and canUpsert method instead where it mustn't be possible for BOTH to be true. It's either an update existing thing or create non-existing thing
  // can perform request START
  if (
    (!namespaceResult.checkSkipped && // multinamespace objects
      (namespaceResult?.checkResult === 'found_outside_namespace' || // can't create an object that already exists
        (!upsert && namespaceResult?.checkResult === 'not_found'))) || // can't update an object
    // this check is slightly different and actually versifies if we can do the update or upsert request
    (namespaceResult.checkSkipped && // non-multinamespace objects
      !upsert &&
      getResult.checkDocFound === 'not_found')
  ) {
    return errorMap(
      logger,
      'not_found',
      SavedObjectsErrorHelpers.createGenericNotFoundError(type, id)
    );
  }
};
// TODO complete me
// const canPerformUpsert = (params: CanPerformUpdateParams) => {
//   return;
// };
