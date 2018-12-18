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

import elasticsearch from '@elastic/elasticsearch';
import { get } from 'lodash';

const {
  ConnectionError,
  TimeoutError,
  NoLivingConnectionsError,
  ResponseError
} = elasticsearch.errors;

import {
  decorateBadRequestError,
  decorateNotAuthorizedError,
  decorateForbiddenError,
  decorateRequestEntityTooLargeError,
  createGenericNotFoundError,
  decorateConflictError,
  decorateEsUnavailableError,
  decorateGeneralError,
} from './errors';

export function decorateEsError(error) {
  if (!(error instanceof Error)) {
    throw new Error('Expected an instance of Error');
  }

  const { reason } = get(error, 'body.error', {});
  if (
    error instanceof ConnectionError ||
    error instanceof NoLivingConnectionsError ||
    error instanceof TimeoutError ||
    // TODO: The new client considers as "service unavailable"
    // (so worth of request retry) errors with status codes 502, 503, and 504.
    // Do we want to handle them as well?
    error.statusCode === 503 // Service Unavailable
  ) {
    return decorateEsUnavailableError(error, reason);
  }

  if (error instanceof ResponseError) {
    // Conflict
    if (error.statusCode === 409) {
      return decorateConflictError(error, reason);
    }

    // Not Authorized
    if (error.statusCode === 401) {
      return decorateNotAuthorizedError(error, reason);
    }

    // Forbidden
    if (error.statusCode === 403) {
      return decorateForbiddenError(error, reason);
    }

    // Request Entity Too Large
    if (error.statusCode === 413) {
      return decorateRequestEntityTooLargeError(error, reason);
    }

    // Not Found
    if (error.statusCode === 404) {
      return createGenericNotFoundError();
    }

    // Bas Request
    if (error.statusCode === 400) {
      return decorateBadRequestError(error, reason);
    }
  }

  return decorateGeneralError(error, reason);
}
