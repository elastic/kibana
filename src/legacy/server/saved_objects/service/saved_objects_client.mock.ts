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

import { SavedObjectsClientContract } from './saved_objects_client';

const create = () => {
  const mock: jest.Mocked<SavedObjectsClientContract> = {
    errors: {
      isSavedObjectsClientError: jest.fn(),
      decorateBadRequestError: jest.fn(),
      createBadRequestError: jest.fn(),
      createUnsupportedTypeError: jest.fn(),
      isBadRequestError: jest.fn(),
      createInvalidVersionError: jest.fn(),
      isInvalidVersionError: jest.fn(),
      decorateNotAuthorizedError: jest.fn(),
      isNotAuthorizedError: jest.fn(),
      decorateForbiddenError: jest.fn(),
      isForbiddenError: jest.fn(),
      decorateRequestEntityTooLargeError: jest.fn(),
      isRequestEntityTooLargeError: jest.fn(),
      createGenericNotFoundError: jest.fn(),
      isNotFoundError: jest.fn(),
      decorateConflictError: jest.fn(),
      isConflictError: jest.fn(),
      decorateEsUnavailableError: jest.fn(),
      isEsUnavailableError: jest.fn(),
      createEsAutoCreateIndexError: jest.fn(),
      isEsAutoCreateIndexError: jest.fn(),
      decorateGeneralError: jest.fn(),
    },
    create: jest.fn(),
    bulkCreate: jest.fn(),
    delete: jest.fn(),
    bulkGet: jest.fn(),
    find: jest.fn(),
    get: jest.fn(),
    update: jest.fn(),
  };

  return mock;
};

export const SavedObjectsClientMock = { create };
