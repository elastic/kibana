/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectsClientPublicToCommon } from './saved_objects_client_wrapper';
import { savedObjectsServiceMock } from '@kbn/core/public/mocks';

import { DataViewSavedObjectConflictError } from '../common';

describe('SavedObjectsClientPublicToCommon', () => {
  const soClient = savedObjectsServiceMock.createStartContract().client;

  test('get saved object - exactMatch', async () => {
    const mockedSavedObject = {
      version: 'abc',
    };
    soClient.resolve = jest
      .fn()
      .mockResolvedValue({ outcome: 'exactMatch', saved_object: mockedSavedObject });
    const service = new SavedObjectsClientPublicToCommon(soClient);
    const result = await service.get('index-pattern', '1');
    expect(result).toStrictEqual(mockedSavedObject);
  });

  test('get saved object - aliasMatch', async () => {
    const mockedSavedObject = {
      version: 'def',
    };
    soClient.resolve = jest
      .fn()
      .mockResolvedValue({ outcome: 'aliasMatch', saved_object: mockedSavedObject });
    const service = new SavedObjectsClientPublicToCommon(soClient);
    const result = await service.get('index-pattern', '1');
    expect(result).toStrictEqual(mockedSavedObject);
  });

  test('get saved object - conflict', async () => {
    const mockedSavedObject = {
      version: 'ghi',
    };

    soClient.resolve = jest
      .fn()
      .mockResolvedValue({ outcome: 'conflict', saved_object: mockedSavedObject });
    const service = new SavedObjectsClientPublicToCommon(soClient);

    await expect(service.get('index-pattern', '1')).rejects.toThrow(
      DataViewSavedObjectConflictError
    );
  });
});
