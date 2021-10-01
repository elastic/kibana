/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectsClient } from './saved_objects_client';

test(`#create`, async () => {
  const returnValue = Symbol();
  const mockRepository = {
    create: jest.fn().mockResolvedValue(returnValue),
  };
  const client = new SavedObjectsClient(mockRepository);

  const type = Symbol();
  const attributes = Symbol();
  const options = Symbol();
  const result = await client.create(type, attributes, options);

  expect(mockRepository.create).toHaveBeenCalledWith(type, attributes, options);
  expect(result).toBe(returnValue);
});

test(`#checkConflicts`, async () => {
  const returnValue = Symbol();
  const mockRepository = {
    checkConflicts: jest.fn().mockResolvedValue(returnValue),
  };
  const client = new SavedObjectsClient(mockRepository);

  const objects = Symbol();
  const options = Symbol();
  const result = await client.checkConflicts(objects, options);

  expect(mockRepository.checkConflicts).toHaveBeenCalledWith(objects, options);
  expect(result).toBe(returnValue);
});

test(`#bulkCreate`, async () => {
  const returnValue = Symbol();
  const mockRepository = {
    bulkCreate: jest.fn().mockResolvedValue(returnValue),
  };
  const client = new SavedObjectsClient(mockRepository);

  const objects = Symbol();
  const options = Symbol();
  const result = await client.bulkCreate(objects, options);

  expect(mockRepository.bulkCreate).toHaveBeenCalledWith(objects, options);
  expect(result).toBe(returnValue);
});

describe(`#createPointInTimeFinder`, () => {
  test(`calls repository with options and default dependencies`, () => {
    const returnValue = Symbol();
    const mockRepository = {
      createPointInTimeFinder: jest.fn().mockReturnValue(returnValue),
    };
    const client = new SavedObjectsClient(mockRepository);

    const options = Symbol();
    const result = client.createPointInTimeFinder(options);

    expect(mockRepository.createPointInTimeFinder).toHaveBeenCalledWith(options, {
      client,
    });
    expect(result).toBe(returnValue);
  });

  test(`calls repository with options and custom dependencies`, () => {
    const returnValue = Symbol();
    const mockRepository = {
      createPointInTimeFinder: jest.fn().mockReturnValue(returnValue),
    };
    const client = new SavedObjectsClient(mockRepository);

    const options = Symbol();
    const dependencies = {
      client: {
        find: Symbol(),
        openPointInTimeForType: Symbol(),
        closePointInTime: Symbol(),
      },
    };
    const result = client.createPointInTimeFinder(options, dependencies);

    expect(mockRepository.createPointInTimeFinder).toHaveBeenCalledWith(options, dependencies);
    expect(result).toBe(returnValue);
  });
});

test(`#delete`, async () => {
  const returnValue = Symbol();
  const mockRepository = {
    delete: jest.fn().mockResolvedValue(returnValue),
  };
  const client = new SavedObjectsClient(mockRepository);

  const type = Symbol();
  const id = Symbol();
  const options = Symbol();
  const result = await client.delete(type, id, options);

  expect(mockRepository.delete).toHaveBeenCalledWith(type, id, options);
  expect(result).toBe(returnValue);
});

test(`#find`, async () => {
  const returnValue = Symbol();
  const mockRepository = {
    find: jest.fn().mockResolvedValue(returnValue),
  };
  const client = new SavedObjectsClient(mockRepository);

  const options = Symbol();
  const result = await client.find(options);

  expect(mockRepository.find).toHaveBeenCalledWith(options);
  expect(result).toBe(returnValue);
});

test(`#bulkGet`, async () => {
  const returnValue = Symbol();
  const mockRepository = {
    bulkGet: jest.fn().mockResolvedValue(returnValue),
  };
  const client = new SavedObjectsClient(mockRepository);

  const objects = Symbol();
  const options = Symbol();
  const result = await client.bulkGet(objects, options);

  expect(mockRepository.bulkGet).toHaveBeenCalledWith(objects, options);
  expect(result).toBe(returnValue);
});

test(`#get`, async () => {
  const returnValue = Symbol();
  const mockRepository = {
    get: jest.fn().mockResolvedValue(returnValue),
  };
  const client = new SavedObjectsClient(mockRepository);

  const type = Symbol();
  const id = Symbol();
  const options = Symbol();
  const result = await client.get(type, id, options);

  expect(mockRepository.get).toHaveBeenCalledWith(type, id, options);
  expect(result).toBe(returnValue);
});

test(`#openPointInTimeForType`, async () => {
  const returnValue = Symbol();
  const mockRepository = {
    openPointInTimeForType: jest.fn().mockResolvedValue(returnValue),
  };
  const client = new SavedObjectsClient(mockRepository);

  const type = Symbol();
  const options = Symbol();
  const result = await client.openPointInTimeForType(type, options);

  expect(mockRepository.openPointInTimeForType).toHaveBeenCalledWith(type, options);
  expect(result).toBe(returnValue);
});

test(`#closePointInTime`, async () => {
  const returnValue = Symbol();
  const mockRepository = {
    closePointInTime: jest.fn().mockResolvedValue(returnValue),
  };
  const client = new SavedObjectsClient(mockRepository);

  const id = Symbol();
  const options = Symbol();
  const result = await client.closePointInTime(id, options);

  expect(mockRepository.closePointInTime).toHaveBeenCalledWith(id, options);
  expect(result).toBe(returnValue);
});

test(`#bulkResolve`, async () => {
  const returnValue = Symbol();
  const mockRepository = {
    bulkResolve: jest.fn().mockResolvedValue(returnValue),
  };
  const client = new SavedObjectsClient(mockRepository);

  const objects = Symbol();
  const options = Symbol();
  const result = await client.bulkResolve(objects, options);

  expect(mockRepository.bulkResolve).toHaveBeenCalledWith(objects, options);
  expect(result).toBe(returnValue);
});

test(`#resolve`, async () => {
  const returnValue = Symbol();
  const mockRepository = {
    resolve: jest.fn().mockResolvedValue(returnValue),
  };
  const client = new SavedObjectsClient(mockRepository);

  const type = Symbol();
  const id = Symbol();
  const options = Symbol();
  const result = await client.resolve(type, id, options);

  expect(mockRepository.resolve).toHaveBeenCalledWith(type, id, options);
  expect(result).toBe(returnValue);
});

test(`#update`, async () => {
  const returnValue = Symbol();
  const mockRepository = {
    update: jest.fn().mockResolvedValue(returnValue),
  };
  const client = new SavedObjectsClient(mockRepository);

  const type = Symbol();
  const id = Symbol();
  const attributes = Symbol();
  const options = Symbol();
  const result = await client.update(type, id, attributes, options);

  expect(mockRepository.update).toHaveBeenCalledWith(type, id, attributes, options);
  expect(result).toBe(returnValue);
});

test(`#bulkUpdate`, async () => {
  const returnValue = Symbol();
  const mockRepository = {
    bulkUpdate: jest.fn().mockResolvedValue(returnValue),
  };
  const client = new SavedObjectsClient(mockRepository);

  const type = Symbol();
  const id = Symbol();
  const attributes = Symbol();
  const version = Symbol();
  const namespace = Symbol();
  const result = await client.bulkUpdate([{ type, id, attributes, version }], { namespace });

  expect(mockRepository.bulkUpdate).toHaveBeenCalledWith([{ type, id, attributes, version }], {
    namespace,
  });
  expect(result).toBe(returnValue);
});

test(`#collectMultiNamespaceReferences`, async () => {
  const returnValue = Symbol();
  const mockRepository = {
    collectMultiNamespaceReferences: jest.fn().mockResolvedValue(returnValue),
  };
  const client = new SavedObjectsClient(mockRepository);

  const objects = Symbol();
  const options = Symbol();
  const result = await client.collectMultiNamespaceReferences(objects, options);

  expect(mockRepository.collectMultiNamespaceReferences).toHaveBeenCalledWith(objects, options);
  expect(result).toBe(returnValue);
});

test(`#updateObjectsSpaces`, async () => {
  const returnValue = Symbol();
  const mockRepository = {
    updateObjectsSpaces: jest.fn().mockResolvedValue(returnValue),
  };
  const client = new SavedObjectsClient(mockRepository);

  const objects = Symbol();
  const spacesToAdd = Symbol();
  const spacesToRemove = Symbol();
  const options = Symbol();
  const result = await client.updateObjectsSpaces(objects, spacesToAdd, spacesToRemove, options);

  expect(mockRepository.updateObjectsSpaces).toHaveBeenCalledWith(
    objects,
    spacesToAdd,
    spacesToRemove,
    options
  );
  expect(result).toBe(returnValue);
});
