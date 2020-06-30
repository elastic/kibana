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

import * as legacyElasticsearch from 'elasticsearch';
import { get } from 'lodash';

const {
  ConnectionFault,
  ServiceUnavailable,
  NoConnections,
  RequestTimeout,
  Conflict,
  // @ts-expect-error
  401: NotAuthorized,
  // @ts-expect-error
  403: Forbidden,
  // @ts-expect-error
  413: RequestEntityTooLarge,
  NotFound,
  BadRequest,
} = legacyElasticsearch.errors;
const SCRIPT_CONTEXT_DISABLED_REGEX = /(?:cannot execute scripts using \[)([a-z]*)(?:\] context)/;
const INLINE_SCRIPTS_DISABLED_MESSAGE = 'cannot execute [inline] scripts';

import { SavedObjectsErrorHelpers } from './errors';

export function decorateEsError(error: Error) {
  if (!(error instanceof Error)) {
    throw new Error('Expected an instance of Error');
  }

  const { reason } = get(error, 'body.error', { reason: undefined }) as { reason?: string };
  if (
    error instanceof ConnectionFault ||
    error instanceof ServiceUnavailable ||
    error instanceof NoConnections ||
    error instanceof RequestTimeout
  ) {
    return SavedObjectsErrorHelpers.decorateEsUnavailableError(error, reason);
  }

  if (error instanceof Conflict) {
    return SavedObjectsErrorHelpers.decorateConflictError(error, reason);
  }

  if (error instanceof NotAuthorized) {
    return SavedObjectsErrorHelpers.decorateNotAuthorizedError(error, reason);
  }

  if (error instanceof Forbidden) {
    return SavedObjectsErrorHelpers.decorateForbiddenError(error, reason);
  }

  if (error instanceof RequestEntityTooLarge) {
    return SavedObjectsErrorHelpers.decorateRequestEntityTooLargeError(error, reason);
  }

  if (error instanceof NotFound) {
    return SavedObjectsErrorHelpers.createGenericNotFoundError();
  }

  if (error instanceof BadRequest) {
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
