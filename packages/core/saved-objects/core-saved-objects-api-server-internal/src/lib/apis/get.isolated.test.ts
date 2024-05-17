/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CheckAuthorizationResult, SavedObject } from '@kbn/core-saved-objects-server';
import { ApiExecutionContextMock, apiContextMock } from '../../mocks';
import { performGet } from './get';
import {
  getSavedObjectFromSourceMock,
  isFoundGetResponseMock,
  rawDocExistsInNamespaceMock,
} from './get.isolated.test.mocks';

const createSavedObject = (id = 'foo'): SavedObject => {
  return {
    id,
    type: 'bar',
    attributes: {},
    references: [],
  };
};

describe('performGet', () => {
  let apiContext: ApiExecutionContextMock;

  beforeEach(() => {
    apiContext = apiContextMock.create({
      allowedTypes: ['type'],
    });

    getSavedObjectFromSourceMock.mockReset();
    isFoundGetResponseMock.mockReset().mockReturnValue(true);
    rawDocExistsInNamespaceMock.mockReset().mockResolvedValue(true);

    apiContext.client.get.mockResponse({ _index: '.kibana', found: true, _id: '_id' });
  });

  it('calls migrationHelper.migrateAndDecryptStorageDocument with the correct parameters', async () => {
    const savedObject = createSavedObject();
    getSavedObjectFromSourceMock.mockReturnValue(savedObject);

    const checkResult: CheckAuthorizationResult<string> = {
      status: 'fully_authorized',
      typeMap: new Map(),
    };
    apiContext.extensions.securityExtension!.authorizeGet.mockResolvedValue(checkResult);

    const type = 'type';
    const id = 'id';

    await performGet({ type, id, options: {} }, apiContext);

    expect(apiContext.helpers.migration.migrateAndDecryptStorageDocument).toHaveBeenCalledTimes(1);
    expect(apiContext.helpers.migration.migrateAndDecryptStorageDocument).toHaveBeenCalledWith({
      document: savedObject,
      typeMap: checkResult.typeMap,
    });
  });
});
