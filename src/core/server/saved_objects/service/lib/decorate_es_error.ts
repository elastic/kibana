/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { errors as esErrors } from '@elastic/elasticsearch';
import { get } from 'lodash';

const responseErrors = {
  isServiceUnavailable: (statusCode: number) => statusCode === 503,
  isConflict: (statusCode: number) => statusCode === 409,
  isNotAuthorized: (statusCode: number) => statusCode === 401,
  isForbidden: (statusCode: number) => statusCode === 403,
  isRequestEntityTooLarge: (statusCode: number) => statusCode === 413,
  isNotFound: (statusCode: number) => statusCode === 404,
  isBadRequest: (statusCode: number) => statusCode === 400,
  isTooManyRequests: (statusCode: number) => statusCode === 429,
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
