/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TelemetrySavedObjectsClient } from './telemetry_saved_objects_client';
import { savedObjectsRepositoryMock } from '@kbn/core/server/mocks';

describe('TelemetrySavedObjectsClient', () => {
  test("find requests are extended with `namespaces:['*']`", async () => {
    const savedObjectsRepository = savedObjectsRepositoryMock.create();
    const telemetrySavedObjectsClient = new TelemetrySavedObjectsClient(savedObjectsRepository);
    await telemetrySavedObjectsClient.find({ type: 'my-test-type' });
    expect(savedObjectsRepository.find).toBeCalledWith({ type: 'my-test-type', namespaces: ['*'] });
  });
  test("allow callers to overwrite the `namespaces:['*']`", async () => {
    const savedObjectsRepository = savedObjectsRepositoryMock.create();
    const telemetrySavedObjectsClient = new TelemetrySavedObjectsClient(savedObjectsRepository);
    await telemetrySavedObjectsClient.find({ type: 'my-test-type', namespaces: ['some_space'] });
    expect(savedObjectsRepository.find).toBeCalledWith({
      type: 'my-test-type',
      namespaces: ['some_space'],
    });
  });
});
