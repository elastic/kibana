/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { errors as esErrors } from '@elastic/elasticsearch';
import { get } from 'lodash';
import { ElasticsearchErrorDetails, isSupportedEsServer } from '../../../elasticsearch';

const responseErrors = {
  isServiceUnavailable: (statusCode?: number) => statusCode === 503,
  isConflict: (statusCode?: number) => statusCode === 409,
  isNotAuthorized: (statusCode?: number) => statusCode === 401,
  isForbidden: (statusCode?: number) => statusCode === 403,
  isRequestEntityTooLarge: (statusCode?: number) => statusCode === 413,
  isNotFound: (statusCode?: number) => statusCode === 404,
  isBadRequest: (statusCode?: number) => statusCode === 400,
  isTooManyRequests: (statusCode?: number) => statusCode === 429,
};
const { ConnectionError, NoLivingConnectionsError, TimeoutError } = esErrors;
const SCRIPT_CONTEXT_DISABLED_REGEX = /(?:cannot execute scripts using \[)([a-z]*)(?:\] context)/;
const INLINE_SCRIPTS_DISABLED_MESSAGE = 'cannot execute [inline] scripts';

import { SavedObjectsErrorHelpers } from './errors';

type EsErrors =
  | esErrors.ConnectionError
  | esErrors.NoLivingConnectionsError
  | esErrors.TimeoutError
  | esErrors.ResponseError;

export function decorateEsError(error: EsErrors) {
  if (!(error instanceof Error)) {
    throw new Error('Expected an instance of Error');
  }

  const { reason } = get(error, 'body.error', { reason: undefined }) as { reason?: string };
  if (
    error instanceof ConnectionError ||
    error instanceof NoLivingConnectionsError ||
    error instanceof TimeoutError ||
    responseErrors.isServiceUnavailable(error.statusCode)
  ) {
    return SavedObjectsErrorHelpers.decorateEsUnavailableError(error, reason);
  }

  if (responseErrors.isConflict(error.statusCode)) {
    return SavedObjectsErrorHelpers.decorateConflictError(error, reason);
  }

  if (responseErrors.isNotAuthorized(error.statusCode)) {
    return SavedObjectsErrorHelpers.decorateNotAuthorizedError(error, reason);
  }

  if (responseErrors.isForbidden(error.statusCode)) {
    return SavedObjectsErrorHelpers.decorateForbiddenError(error, reason);
  }

  if (responseErrors.isRequestEntityTooLarge(error.statusCode)) {
    return SavedObjectsErrorHelpers.decorateRequestEntityTooLargeError(error, reason);
  }

  if (responseErrors.isNotFound(error.statusCode)) {
    const match = (error?.meta?.body as ElasticsearchErrorDetails)?.error?.reason?.match(
      /no such index \[(.+)\] and \[require_alias\] request flag is \[true\] and \[.+\] is not an alias/
    );
    if (match && match.length > 0) {
      return SavedObjectsErrorHelpers.decorateIndexAliasNotFoundError(error, match[1]);
    }
    // Throw EsUnavailable error if the 404 is not from elasticsearch
    // Needed here to verify Product support for any non-ignored 404 responses from calls to ES
    if (!isSupportedEsServer(error?.meta?.headers)) {
      return SavedObjectsErrorHelpers.createGenericNotFoundEsUnavailableError();
    }
    return SavedObjectsErrorHelpers.createGenericNotFoundError();
  }

  if (responseErrors.isTooManyRequests(error.statusCode)) {
    return SavedObjectsErrorHelpers.decorateTooManyRequestsError(error, reason);
  }

  if (responseErrors.isBadRequest(error.statusCode)) {
    if (
      SCRIPT_CONTEXT_DISABLED_REGEX.test(reason || '') ||
      reason === INLINE_SCRIPTS_DISABLED_MESSAGE
    ) {
      return SavedObjectsErrorHelpers.decorateEsCannotExecuteScriptError(error, reason);
    }
    return SavedObjectsErrorHelpers.decorateBadRequestError(error, reason);
  }

  return SavedObjectsErrorHelpers.decorateGeneralError(error, reason);
}
