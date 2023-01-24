/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mockBuildNode } from './find_sample_objects.test.mock';

import type { SavedObject, SavedObjectsFindResponse } from '@kbn/core/server';
import { savedObjectsClientMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { findSampleObjects } from './find_sample_objects';

describe('findSampleObjects', () => {
  function setup() {
    const mockClient = savedObjectsClientMock.create();
    const mockLogger = loggingSystemMock.createLogger();
    return {
      client: mockClient,
      logger: mockLogger,
    };
  }

  beforeEach(() => {
    mockBuildNode.mockReset();
  });

  it('searches for objects and returns expected results', async () => {
    const { client, logger } = setup();
    const obj1 = { type: 'obj-type-1', id: 'obj-id-1' };
    const obj2 = { type: 'obj-type-2', id: 'obj-id-2' };
    const obj3 = { type: 'obj-type-3', id: 'obj-id-3' };
    const obj4 = { type: 'obj-type-3', id: 'obj-id-4' };
    const objects = [obj1, obj2, obj3, obj4];
    const params = { client, logger, objects };

    client.bulkGet.mockResolvedValue({
      saved_objects: [
        obj1, // bulkGet success for obj1
        { ...obj2, error: { statusCode: 403 } }, // bulkGet failure - will not attempt to find by originId since the error is not 404
        { ...obj3, error: { statusCode: 404 } }, // bulkGet failure - will attempt to find by originId since the error is 404
        { ...obj4, error: { statusCode: 404 } }, // bulkGet failure - will attempt to find by originId since the error is 404
      ] as SavedObject[],
    });
    client.find.mockResolvedValue({
      saved_objects: [{ type: obj4.type, id: 'obj-id-x', originId: obj4.id }], // find success for obj4
      total: 1,
    } as SavedObjectsFindResponse);
    const result = await findSampleObjects(params);

    expect(result).toEqual([
      { ...obj1, foundObjectId: obj1.id },
      { ...obj2, foundObjectId: undefined },
      { ...obj3, foundObjectId: undefined },
      { ...obj4, foundObjectId: 'obj-id-x' },
    ]);
    expect(client.bulkGet).toHaveBeenCalledWith(objects);
    expect(mockBuildNode).toHaveBeenCalledTimes(3);
    expect(mockBuildNode).toHaveBeenNthCalledWith(1, 'is', `${obj3.type}.originId`, obj3.id);
    expect(mockBuildNode).toHaveBeenNthCalledWith(2, 'is', `${obj4.type}.originId`, obj4.id);
    expect(mockBuildNode).toHaveBeenNthCalledWith(3, 'or', expect.any(Array));
    expect(client.find).toHaveBeenCalledWith(expect.objectContaining({ type: ['obj-type-3'] })); // obj3 and obj4 have the same type; the type param is deduplicated
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('skips find if there are no objects left to search for', async () => {
    const { client, logger } = setup();
    const obj1 = { type: 'obj-type-1', id: 'obj-id-1' };
    const obj2 = { type: 'obj-type-2', id: 'obj-id-2' };
    const objects = [obj1, obj2];
    const params = { client, logger, objects };

    client.bulkGet.mockResolvedValue({
      saved_objects: [
        obj1, // bulkGet success for obj1
        { ...obj2, error: { statusCode: 403 } }, // bulkGet failure - will not attempt to find by originId since the error is not 404
      ] as SavedObject[],
    });
    const result = await findSampleObjects(params);

    expect(result).toEqual([
      { ...obj1, foundObjectId: obj1.id },
      { ...obj2, foundObjectId: undefined },
    ]);
    expect(client.bulkGet).toHaveBeenCalledWith(objects);
    expect(mockBuildNode).not.toHaveBeenCalled();
    expect(client.find).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('logs expected warnings', async () => {
    const { client, logger } = setup();
    const obj1 = { type: 'obj-type-1', id: 'obj-id-1' };
    const objects = [obj1];
    const params = { client, logger, objects };

    client.bulkGet.mockResolvedValue({
      saved_objects: [
        { ...obj1, error: { statusCode: 404 } }, // bulkGet failure - will attempt to find by originId since the error is 404
      ] as SavedObject[],
    });
    client.find.mockResolvedValue({
      saved_objects: [
        { type: obj1.type, id: 'obj-id-x', originId: obj1.id }, // find success for obj4
        { type: obj1.type, id: 'obj-id-y', originId: obj1.id }, // find success for obj4
      ],
      total: 10001,
    } as SavedObjectsFindResponse);
    const result = await findSampleObjects(params);
    expect(result).toEqual([{ ...obj1, foundObjectId: 'obj-id-x' }]); // obj-id-y is ignored
    expect(client.bulkGet).toHaveBeenCalledWith(objects);
    expect(mockBuildNode).toHaveBeenCalledTimes(2);
    expect(mockBuildNode).toHaveBeenNthCalledWith(1, 'is', `${obj1.type}.originId`, obj1.id);
    expect(mockBuildNode).toHaveBeenNthCalledWith(2, 'or', expect.any(Array));
    expect(client.find).toHaveBeenCalledWith(expect.objectContaining({ type: ['obj-type-1'] }));
    expect(logger.warn).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledWith(
      'findSampleObjects got 10001 results, only using the first 10000'
    );
    expect(logger.warn).toHaveBeenCalledWith(
      'Found two sample objects with the same origin "obj-id-1" (previously found "obj-id-x", ignoring "obj-id-y")'
    );
  });
});
