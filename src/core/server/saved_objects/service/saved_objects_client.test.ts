/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  SavedObjectsBulkCreateObject,
  SavedObjectsBulkGetObject,
  SavedObjectsBulkResolveObject,
  SavedObjectsCheckConflictsObject,
  SavedObjectsClient,
  SavedObjectsClosePointInTimeOptions,
  SavedObjectsCreateOptions,
  SavedObjectsDeleteOptions,
  SavedObjectsOpenPointInTimeOptions,
  SavedObjectsUpdateOptions,
} from './saved_objects_client';
import { savedObjectsRepositoryMock } from './lib/repository.mock';
import { savedObjectsClientMock } from './saved_objects_client.mock';
import {
  SavedObjectsBaseOptions,
  SavedObjectsCollectMultiNamespaceReferencesObject,
  SavedObjectsCollectMultiNamespaceReferencesOptions,
  SavedObjectsCreatePointInTimeFinderOptions,
  SavedObjectsFindOptions,
  SavedObjectsUpdateObjectsSpacesObject,
  SavedObjectsUpdateObjectsSpacesOptions,
} from '../..';

describe('', () => {
  let mockRepository: ReturnType<typeof savedObjectsRepositoryMock.create>;

  beforeEach(() => {
    mockRepository = savedObjectsRepositoryMock.create();
  });

  test(`#create`, async () => {
    const returnValue: any = Symbol();
    mockRepository.create.mockResolvedValueOnce(returnValue);
    const client = new SavedObjectsClient(mockRepository);

    const type = 'foo';
    const attributes = { string: 'str', number: 12 };
    const options: SavedObjectsCreateOptions = { id: 'id', namespace: 'bar' };
    const result = await client.create(type, attributes, options);

    expect(mockRepository.create).toHaveBeenCalledWith(type, attributes, options);
    expect(result).toBe(returnValue);
  });

  test(`#checkConflicts`, async () => {
    const returnValue: any = Symbol();
    mockRepository.checkConflicts.mockResolvedValueOnce(returnValue);
    const client = new SavedObjectsClient(mockRepository);

    const objects: SavedObjectsCheckConflictsObject[] = [
      { id: '1', type: 'foo' },
      { id: '2', type: 'bar' },
    ];
    const options: SavedObjectsBaseOptions = { namespace: 'ns-1' };
    const result = await client.checkConflicts(objects, options);

    expect(mockRepository.checkConflicts).toHaveBeenCalledWith(objects, options);
    expect(result).toBe(returnValue);
  });

  test(`#bulkCreate`, async () => {
    const returnValue: any = Symbol();
    mockRepository.bulkCreate.mockResolvedValueOnce(returnValue);
    const client = new SavedObjectsClient(mockRepository);

    const objects: SavedObjectsBulkCreateObject[] = [
      { type: 'foo', attributes: { hello: 'dolly' } },
      { type: 'bar', attributes: { answer: 42 } },
    ];
    const options: SavedObjectsCreateOptions = { namespace: 'new-ns', refresh: true };
    const result = await client.bulkCreate(objects, options);

    expect(mockRepository.bulkCreate).toHaveBeenCalledWith(objects, options);
    expect(result).toBe(returnValue);
  });

  describe(`#createPointInTimeFinder`, () => {
    test(`calls repository with options and default dependencies`, () => {
      const returnValue: any = Symbol();
      mockRepository.createPointInTimeFinder.mockReturnValue(returnValue);
      const client = new SavedObjectsClient(mockRepository);

      const options: SavedObjectsCreatePointInTimeFinderOptions = {
        perPage: 50,
        search: 'candy',
        type: 'foo',
      };
      const result = client.createPointInTimeFinder(options);

      expect(mockRepository.createPointInTimeFinder).toHaveBeenCalledWith(options, {
        client,
      });
      expect(result).toBe(returnValue);
    });

    test(`calls repository with options and custom dependencies`, () => {
      const returnValue: any = Symbol();
      mockRepository.createPointInTimeFinder.mockReturnValue(returnValue);
      const client = new SavedObjectsClient(mockRepository);

      const options: SavedObjectsCreatePointInTimeFinderOptions = {
        perPage: 50,
        search: 'candy',
        type: 'foo',
      };
      const dependencies = {
        client: savedObjectsClientMock.create(),
      };
      const result = client.createPointInTimeFinder(options, dependencies);

      expect(mockRepository.createPointInTimeFinder).toHaveBeenCalledWith(options, dependencies);
      expect(result).toBe(returnValue);
    });
  });

  test(`#delete`, async () => {
    const returnValue: any = Symbol();
    mockRepository.delete.mockResolvedValueOnce(returnValue);
    const client = new SavedObjectsClient(mockRepository);

    const type = 'foo';
    const id = '12';
    const options: SavedObjectsDeleteOptions = { force: true, refresh: false };
    const result = await client.delete(type, id, options);

    expect(mockRepository.delete).toHaveBeenCalledWith(type, id, options);
    expect(result).toBe(returnValue);
  });

  test(`#find`, async () => {
    const returnValue: any = Symbol();
    mockRepository.find.mockResolvedValueOnce(returnValue);
    const client = new SavedObjectsClient(mockRepository);

    const options: SavedObjectsFindOptions = { search: 'something', type: ['a', 'b'], perPage: 42 };
    const result = await client.find(options);

    expect(mockRepository.find).toHaveBeenCalledWith(options);
    expect(result).toBe(returnValue);
  });

  test(`#bulkGet`, async () => {
    const returnValue: any = Symbol();
    mockRepository.bulkGet.mockResolvedValueOnce(returnValue);
    const client = new SavedObjectsClient(mockRepository);

    const objects: SavedObjectsBulkGetObject[] = [
      { type: 'foo', id: '1' },
      { type: 'bar', id: '2' },
    ];
    const options: SavedObjectsBaseOptions = { namespace: 'ns-1' };
    const result = await client.bulkGet(objects, options);

    expect(mockRepository.bulkGet).toHaveBeenCalledWith(objects, options);
    expect(result).toBe(returnValue);
  });

  test(`#get`, async () => {
    const returnValue: any = Symbol();
    mockRepository.get.mockResolvedValueOnce(returnValue);
    const client = new SavedObjectsClient(mockRepository);

    const type = 'foo';
    const id = '12';
    const options: SavedObjectsBaseOptions = { namespace: 'ns-1' };
    const result = await client.get(type, id, options);

    expect(mockRepository.get).toHaveBeenCalledWith(type, id, options);
    expect(result).toBe(returnValue);
  });

  test(`#openPointInTimeForType`, async () => {
    const returnValue: any = Symbol();
    mockRepository.openPointInTimeForType.mockResolvedValueOnce(returnValue);
    const client = new SavedObjectsClient(mockRepository);

    const type = 'search';
    const options: SavedObjectsOpenPointInTimeOptions = {
      namespaces: ['ns-1', 'ns-2'],
      preference: 'pref',
    };
    const result = await client.openPointInTimeForType(type, options);

    expect(mockRepository.openPointInTimeForType).toHaveBeenCalledWith(type, options);
    expect(result).toBe(returnValue);
  });

  test(`#closePointInTime`, async () => {
    const returnValue: any = Symbol();
    mockRepository.closePointInTime.mockResolvedValueOnce(returnValue);
    const client = new SavedObjectsClient(mockRepository);

    const id = '42';
    const options: SavedObjectsClosePointInTimeOptions = { namespace: 'ns-42' };
    const result = await client.closePointInTime(id, options);

    expect(mockRepository.closePointInTime).toHaveBeenCalledWith(id, options);
    expect(result).toBe(returnValue);
  });

  test(`#bulkResolve`, async () => {
    const returnValue: any = Symbol();
    mockRepository.bulkResolve.mockResolvedValueOnce(returnValue);
    const client = new SavedObjectsClient(mockRepository);

    const objects: SavedObjectsBulkResolveObject[] = [
      { type: 'foo', id: '1' },
      { type: 'bar', id: '2' },
    ];
    const options: SavedObjectsBaseOptions = { namespace: 'ns-1' };
    const result = await client.bulkResolve(objects, options);

    expect(mockRepository.bulkResolve).toHaveBeenCalledWith(objects, options);
    expect(result).toBe(returnValue);
  });

  test(`#resolve`, async () => {
    const returnValue: any = Symbol();
    mockRepository.resolve.mockResolvedValueOnce(returnValue);
    const client = new SavedObjectsClient(mockRepository);

    const type = 'foo';
    const id = '9000';
    const options: SavedObjectsBaseOptions = { namespace: 'ns-3' };
    const result = await client.resolve(type, id, options);

    expect(mockRepository.resolve).toHaveBeenCalledWith(type, id, options);
    expect(result).toBe(returnValue);
  });

  test(`#update`, async () => {
    const returnValue: any = Symbol();
    mockRepository.update.mockResolvedValueOnce(returnValue);
    const client = new SavedObjectsClient(mockRepository);

    const type = 'some-type';
    const id = '90';
    const attributes = { attr1: 91, attr2: 'some string' };
    const options: SavedObjectsUpdateOptions = { namespace: 'ns-1', version: '12' };
    const result = await client.update(type, id, attributes, options);

    expect(mockRepository.update).toHaveBeenCalledWith(type, id, attributes, options);
    expect(result).toBe(returnValue);
  });

  test(`#bulkUpdate`, async () => {
    const returnValue: any = Symbol();
    mockRepository.bulkUpdate.mockResolvedValueOnce(returnValue);
    const client = new SavedObjectsClient(mockRepository);

    const type = 'some-type';
    const id = '42';
    const attributes = { attr1: 'value' };
    const version = '12.1';
    const namespace = 'ns-1';
    const result = await client.bulkUpdate([{ type, id, attributes, version }], { namespace });

    expect(mockRepository.bulkUpdate).toHaveBeenCalledWith([{ type, id, attributes, version }], {
      namespace,
    });
    expect(result).toBe(returnValue);
  });

  test(`#collectMultiNamespaceReferences`, async () => {
    const returnValue: any = Symbol();
    mockRepository.collectMultiNamespaceReferences.mockResolvedValueOnce(returnValue);
    const client = new SavedObjectsClient(mockRepository);

    const objects: SavedObjectsCollectMultiNamespaceReferencesObject[] = [
      { type: 'foo', id: '1' },
      { type: 'bar', id: '2' },
    ];
    const options: SavedObjectsCollectMultiNamespaceReferencesOptions = {
      namespace: 'ns-1',
      purpose: 'collectMultiNamespaceReferences',
    };
    const result = await client.collectMultiNamespaceReferences(objects, options);

    expect(mockRepository.collectMultiNamespaceReferences).toHaveBeenCalledWith(objects, options);
    expect(result).toBe(returnValue);
  });

  test(`#updateObjectsSpaces`, async () => {
    const returnValue: any = Symbol();
    mockRepository.updateObjectsSpaces.mockResolvedValueOnce(returnValue);
    const client = new SavedObjectsClient(mockRepository);

    const objects: SavedObjectsUpdateObjectsSpacesObject[] = [
      { type: 'foo', id: '1' },
      { type: 'bar', id: '2' },
    ];
    const spacesToAdd = ['to-add', 'to-add-2'];
    const spacesToRemove = ['to-remove', 'to-remove-2'];
    const options: SavedObjectsUpdateObjectsSpacesOptions = { namespace: 'ns-1', refresh: false };
    const result = await client.updateObjectsSpaces(objects, spacesToAdd, spacesToRemove, options);

    expect(mockRepository.updateObjectsSpaces).toHaveBeenCalledWith(
      objects,
      spacesToAdd,
      spacesToRemove,
      options
    );
    expect(result).toBe(returnValue);
  });
});
