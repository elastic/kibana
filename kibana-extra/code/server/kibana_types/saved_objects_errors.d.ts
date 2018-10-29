/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';

export class SavedObjectsErrors {
  public isSavedObjectsClientError(error: any): error is Boom;

  public decorateBadRequestError(error: Error, reason?: string): Boom;
  public isBadRequestError(error: any): error is Boom;

  public decorateNotAuthorizedError(error: Error, reason?: string): Boom;
  public isNotAuthorizedError(error: any): error is Boom;

  public decorateForbiddenError(error: Error, reason?: string): Boom;
  public isForbiddenError(error: any): error is Boom;

  public createGenericNotFoundError(type?: string, id?: string): Boom;
  public isNotFoundError(error: any): error is Boom;

  public decorateConflictError(error: Error, reason?: string): Boom;
  public isConflictError(error: any): error is Boom;

  public decorateEsUnavailableError(error: Error, reason?: string): Boom;
  public isEsUnavailableError(error: any): error is Boom;

  public createEsAutoCreateIndexError(): Boom;
  public isEsAutoCreateIndexError(error: any): error is Boom;

  public decorateGeneralError(error: Error, reason?: string): Boom;
}
