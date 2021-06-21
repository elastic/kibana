/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { applyExportTransformsMock } from './collect_exported_objects.test.mocks';
import { savedObjectsClientMock } from '../../mocks';
import { httpServerMock } from '../../http/http_server.mocks';
import { SavedObject, SavedObjectError } from '../../../types';
import type { SavedObjectsExportTransform } from './types';
import { collectExportedObjects } from './collect_exported_objects';

const createObject = (parts: Partial<SavedObject>): SavedObject => ({
  id: 'id',
  type: 'type',
  references: [],
  attributes: {},
  ...parts,
});

const createError = (parts: Partial<SavedObjectError> = {}): SavedObjectError => ({
  error: 'error',
  message: 'message',
  statusCode: 404,
  ...parts,
});

const toIdTuple = (obj: SavedObject) => ({ type: obj.type, id: obj.id });

describe('collectExportedObjects', () => {
  let savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;
  let request: ReturnType<typeof httpServerMock.createKibanaRequest>;

  beforeEach(() => {
    savedObjectsClient = savedObjectsClientMock.create();
    request = httpServerMock.createKibanaRequest();
    applyExportTransformsMock.mockImplementation(({ objects }) => objects);
    savedObjectsClient.bulkGet.mockResolvedValue({ saved_objects: [] });
  });

  afterEach(() => {
    applyExportTransformsMock.mockReset();
    savedObjectsClient.bulkGet.mockReset();
  });

  describe('when `includeReferences` is `true`', () => {
    it('calls `applyExportTransforms` with the correct parameters', async () => {
      const obj1 = createObject({
        type: 'foo',
        id: '1',
      });
      const obj2 = createObject({
        type: 'foo',
        id: '2',
      });

      const fooTransform: SavedObjectsExportTransform = jest.fn();

      await collectExportedObjects({
        objects: [obj1, obj2],
        savedObjectsClient,
        request,
        exportTransforms: { foo: fooTransform },
        includeReferences: true,
      });

      expect(applyExportTransformsMock).toHaveBeenCalledTimes(1);
      expect(applyExportTransformsMock).toHaveBeenCalledWith({
        objects: [obj1, obj2],
        transforms: { foo: fooTransform },
        request,
      });
    });

    it('returns the collected objects', async () => {
      const foo1 = createObject({
        type: 'foo',
        id: '1',
        references: [
          {
            type: 'bar',
            id: '2',
            name: 'bar-2',
          },
        ],
      });
      const bar2 = createObject({
        type: 'bar',
        id: '2',
      });
      const dolly3 = createObject({
        type: 'dolly',
        id: '3',
      });

      applyExportTransformsMock.mockImplementationOnce(({ objects }) => [...objects, dolly3]);
      savedObjectsClient.bulkGet.mockResolvedValueOnce({
        saved_objects: [bar2],
      });

      const { objects, missingRefs } = await collectExportedObjects({
        objects: [foo1],
        savedObjectsClient,
        request,
        exportTransforms: {},
        includeReferences: true,
      });

      expect(missingRefs).toHaveLength(0);
      expect(objects.map(toIdTuple)).toEqual([foo1, dolly3, bar2].map(toIdTuple));
    });

    it('returns the missing references', async () => {
      const foo1 = createObject({
        type: 'foo',
        id: '1',
        references: [
          {
            type: 'bar',
            id: '2',
            name: 'bar-2',
          },
          {
            type: 'missing',
            id: '1',
            name: 'missing-1',
          },
        ],
      });
      const bar2 = createObject({
        type: 'bar',
        id: '2',
        references: [
          {
            type: 'missing',
            id: '2',
            name: 'missing-2',
          },
        ],
      });
      const missing1 = createObject({
        type: 'missing',
        id: '1',
        error: createError(),
      });
      const missing2 = createObject({
        type: 'missing',
        id: '2',
        error: createError(),
      });

      savedObjectsClient.bulkGet.mockResolvedValueOnce({
        saved_objects: [bar2, missing1],
      });
      savedObjectsClient.bulkGet.mockResolvedValueOnce({
        saved_objects: [missing2],
      });

      const { objects, missingRefs } = await collectExportedObjects({
        objects: [foo1],
        savedObjectsClient,
        request,
        exportTransforms: {},
        includeReferences: true,
      });

      expect(missingRefs).toEqual([missing1, missing2].map(toIdTuple));
      expect(objects.map(toIdTuple)).toEqual([foo1, bar2].map(toIdTuple));
    });

    it('does not call `client.bulkGet` when no objects have references', async () => {
      const obj1 = createObject({
        type: 'foo',
        id: '1',
      });
      const obj2 = createObject({
        type: 'foo',
        id: '2',
      });

      const { objects, missingRefs } = await collectExportedObjects({
        objects: [obj1, obj2],
        savedObjectsClient,
        request,
        exportTransforms: {},
        includeReferences: true,
      });

      expect(missingRefs).toHaveLength(0);
      expect(objects.map(toIdTuple)).toEqual([
        {
          type: 'foo',
          id: '1',
        },
        {
          type: 'foo',
          id: '2',
        },
      ]);

      expect(savedObjectsClient.bulkGet).not.toHaveBeenCalled();
    });

    it('calls `applyExportTransforms` for each iteration', async () => {
      const foo1 = createObject({
        type: 'foo',
        id: '1',
        references: [
          {
            type: 'bar',
            id: '2',
            name: 'bar-2',
          },
        ],
      });
      const bar2 = createObject({
        type: 'bar',
        id: '2',
      });
      savedObjectsClient.bulkGet.mockResolvedValueOnce({
        saved_objects: [bar2],
      });

      await collectExportedObjects({
        objects: [foo1],
        savedObjectsClient,
        request,
        exportTransforms: {},
        includeReferences: true,
      });

      expect(savedObjectsClient.bulkGet).toHaveBeenCalledTimes(1);
      expect(savedObjectsClient.bulkGet).toHaveBeenCalledWith(
        [toIdTuple(bar2)],
        expect.any(Object)
      );

      expect(applyExportTransformsMock).toHaveBeenCalledTimes(2);
      expect(applyExportTransformsMock).toHaveBeenCalledWith({
        objects: [foo1],
        transforms: {},
        request,
      });
      expect(applyExportTransformsMock).toHaveBeenCalledWith({
        objects: [bar2],
        transforms: {},
        request,
      });
    });

    it('ignores references that are already included in the export', async () => {
      const foo1 = createObject({
        type: 'foo',
        id: '1',
        references: [
          {
            type: 'bar',
            id: '2',
            name: 'bar-2',
          },
        ],
      });
      const bar2 = createObject({
        type: 'bar',
        id: '2',
        references: [
          {
            type: 'foo',
            id: '1',
            name: 'foo-1',
          },
          {
            type: 'dolly',
            id: '3',
            name: 'dolly-3',
          },
        ],
      });
      const dolly3 = createObject({
        type: 'dolly',
        id: '3',
        references: [
          {
            type: 'foo',
            id: '1',
            name: 'foo-1',
          },
        ],
      });

      savedObjectsClient.bulkGet.mockResolvedValueOnce({
        saved_objects: [bar2],
      });
      savedObjectsClient.bulkGet.mockResolvedValueOnce({
        saved_objects: [foo1, dolly3],
      });

      const { objects } = await collectExportedObjects({
        objects: [foo1],
        savedObjectsClient,
        request,
        exportTransforms: {},
        includeReferences: true,
      });

      expect(savedObjectsClient.bulkGet).toHaveBeenCalledTimes(2);
      expect(savedObjectsClient.bulkGet).toHaveBeenNthCalledWith(
        1,
        [toIdTuple(bar2)],
        expect.any(Object)
      );
      expect(savedObjectsClient.bulkGet).toHaveBeenNthCalledWith(
        2,
        [toIdTuple(dolly3)],
        expect.any(Object)
      );

      expect(objects.map(toIdTuple)).toEqual([foo1, bar2, dolly3].map(toIdTuple));
    });

    it('does not fetch duplicates of references', async () => {
      const foo1 = createObject({
        type: 'foo',
        id: '1',
        references: [
          {
            type: 'dolly',
            id: '3',
            name: 'dolly-3',
          },
          {
            type: 'baz',
            id: '4',
            name: 'baz-4',
          },
        ],
      });
      const bar2 = createObject({
        type: 'bar',
        id: '2',
        references: [
          {
            type: 'dolly',
            id: '3',
            name: 'dolly-3',
          },
        ],
      });
      const dolly3 = createObject({
        type: 'dolly',
        id: '3',
      });
      const baz4 = createObject({
        type: 'baz',
        id: '4',
      });

      savedObjectsClient.bulkGet.mockResolvedValueOnce({
        saved_objects: [dolly3, baz4],
      });

      await collectExportedObjects({
        objects: [foo1, bar2],
        savedObjectsClient,
        request,
        exportTransforms: {},
        includeReferences: true,
      });

      expect(savedObjectsClient.bulkGet).toHaveBeenCalledTimes(1);
      expect(savedObjectsClient.bulkGet).toHaveBeenCalledWith(
        [dolly3, baz4].map(toIdTuple),
        expect.any(Object)
      );
    });

    it('fetch references for additional objects returned by the export transform', async () => {
      const foo1 = createObject({
        type: 'foo',
        id: '1',
        references: [
          {
            type: 'baz',
            id: '4',
            name: 'baz-4',
          },
        ],
      });
      const bar2 = createObject({
        type: 'bar',
        id: '2',
        references: [
          {
            type: 'dolly',
            id: '3',
            name: 'dolly-3',
          },
        ],
      });

      applyExportTransformsMock.mockImplementationOnce(({ objects }) => [...objects, bar2]);

      savedObjectsClient.bulkGet.mockResolvedValueOnce({
        saved_objects: [],
      });

      await collectExportedObjects({
        objects: [foo1],
        savedObjectsClient,
        request,
        exportTransforms: {},
        includeReferences: true,
      });

      expect(savedObjectsClient.bulkGet).toHaveBeenCalledTimes(1);
      expect(savedObjectsClient.bulkGet).toHaveBeenCalledWith(
        [
          { type: 'baz', id: '4' },
          { type: 'dolly', id: '3' },
        ],
        expect.any(Object)
      );
    });

    it('fetch references for additional objects returned by the export transform of nested references', async () => {
      const foo1 = createObject({
        type: 'foo',
        id: '1',
        references: [
          {
            type: 'bar',
            id: '2',
            name: 'bar-2',
          },
        ],
      });
      const bar2 = createObject({
        type: 'bar',
        id: '2',
        references: [],
      });
      const dolly3 = createObject({
        type: 'dolly',
        id: '3',
        references: [
          {
            type: 'baz',
            id: '4',
            name: 'baz-4',
          },
        ],
      });
      const baz4 = createObject({
        type: 'baz',
        id: '4',
      });

      // first call for foo-1
      applyExportTransformsMock.mockImplementationOnce(({ objects }) => [...objects]);
      // second call for bar-2
      applyExportTransformsMock.mockImplementationOnce(({ objects }) => [...objects, dolly3]);

      savedObjectsClient.bulkGet.mockResolvedValueOnce({
        saved_objects: [bar2],
      });
      savedObjectsClient.bulkGet.mockResolvedValueOnce({
        saved_objects: [baz4],
      });

      await collectExportedObjects({
        objects: [foo1],
        savedObjectsClient,
        request,
        exportTransforms: {},
        includeReferences: true,
      });

      expect(savedObjectsClient.bulkGet).toHaveBeenCalledTimes(2);
      expect(savedObjectsClient.bulkGet).toHaveBeenNthCalledWith(
        1,
        [toIdTuple(bar2)],
        expect.any(Object)
      );
      expect(savedObjectsClient.bulkGet).toHaveBeenNthCalledWith(
        2,
        [toIdTuple(baz4)],
        expect.any(Object)
      );
    });
  });

  describe('when `includeReferences` is `false`', () => {
    it('does not fetch the object references', async () => {
      const obj1 = createObject({
        type: 'foo',
        id: '1',
        references: [
          {
            id: '2',
            type: 'bar',
            name: 'bar-2',
          },
        ],
      });

      const { objects, missingRefs } = await collectExportedObjects({
        objects: [obj1],
        savedObjectsClient,
        request,
        exportTransforms: {},
        includeReferences: false,
      });

      expect(missingRefs).toHaveLength(0);
      expect(objects.map(toIdTuple)).toEqual([
        {
          type: 'foo',
          id: '1',
        },
      ]);

      expect(savedObjectsClient.bulkGet).not.toHaveBeenCalled();
    });
  });
});
