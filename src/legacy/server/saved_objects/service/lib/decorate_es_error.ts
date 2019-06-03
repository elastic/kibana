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

import elasticsearch from 'elasticsearch';
import { get } from 'lodash';

const {
  ConnectionFault,
  ServiceUnavailable,
  NoConnections,
  RequestTimeout,
  Conflict,
  // @ts-ignore
  401: NotAuthorized,
  // @ts-ignore
  403: Forbidden,
  // @ts-ignore
  413: RequestEntityTooLarge,
  NotFound,
  BadRequest,
} = elasticsearch.errors;

import {
  createGenericNotFoundError,
  decorateBadRequestError,
  decorateConflictError,
  decorateEsUnavailableError,
  decorateForbiddenError,
  decorateGeneralError,
  decorateNotAuthorizedError,
  decorateRequestEntityTooLargeError,
} from './errors';

export function decorateEsError(error: Error) {
  if (!(error instanceof Error)) {
    throw new Error('Expected an instance of Error');
  }

  const { reason } = get(error, 'body.error', { reason: undefined });
  if (
    error instanceof ConnectionFault ||
    error instanceof ServiceUnavailable ||
    error instanceof NoConnections ||
    error instanceof RequestTimeout
  ) {
    return decorateEsUnavailableError(error, reason);
  }

  if (error instanceof Conflict) {
    return decorateConflictError(error, reason);
  }

  if (error instanceof NotAuthorized) {
    return decorateNotAuthorizedError(error, reason);
  }

  if (error instanceof Forbidden) {
    return decorateForbiddenError(error, reason);
  }

  if (error instanceof RequestEntityTooLarge) {
    return decorateRequestEntityTooLargeError(error, reason);
  }

  if (error instanceof NotFound) {
    return createGenericNotFoundError();
  }

  if (error instanceof BadRequest) {
    return decorateBadRequestError(error, reason);
  }

  return decorateGeneralError(error, reason);
}
