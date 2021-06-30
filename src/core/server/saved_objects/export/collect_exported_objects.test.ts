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
import { loggerMock } from '../../logging/logger.mock';
import { SavedObject, SavedObjectError } from '../../../types';
import { SavedObjectTypeRegistry } from '../saved_objects_type_registry';
import type { SavedObjectsExportTransform } from './types';
import { collectExportedObjects, ExclusionReason } from './collect_exported_objects';
import { SavedObjectsExportablePredicate } from '../types';

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
const toExcludedObject = (obj: SavedObject, reason: ExclusionReason = 'excluded') => ({
  type: obj.type,
  id: obj.id,
  reason,
});

const toMap = <V>(record: Record<string, V>): Map<string, V> => new Map(Object.entries(record));

describe('collectExportedObjects', () => {
  let savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;
  let request: ReturnType<typeof httpServerMock.createKibanaRequest>;
  let logger: ReturnType<typeof loggerMock.create>;
  let typeRegistry: SavedObjectTypeRegistry;

  const registerType = (
    name: string,
    {
      onExport,
      isExportable,
    }: {
      onExport?: SavedObjectsExportTransform;
      isExportable?: SavedObjectsExportablePredicate;
    } = {}
  ) => {
    typeRegistry.registerType({
      name,
      hidden: false,
      namespaceType: 'single',
      mappings: { properties: {} },
      management: {
        importableAndExportable: true,
        onExport,
        isExportable,
      },
    });
  };

  beforeEach(() => {
    typeRegistry = new SavedObjectTypeRegistry();
    savedObjectsClient = savedObjectsClientMock.create();
    request = httpServerMock.createKibanaRequest();
    logger = loggerMock.create();
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
      registerType('foo', { onExport: fooTransform });

      await collectExportedObjects({
        objects: [obj1, obj2],
        savedObjectsClient,
        request,
        typeRegistry,
        includeReferences: true,
        logger,
      });

      expect(applyExportTransformsMock).toHaveBeenCalledTimes(1);
      expect(applyExportTransformsMock).toHaveBeenCalledWith({
        objects: [obj1, obj2],
        transforms: toMap({ foo: fooTransform }),
        request,
      });
    });

    it('calls `isExportable` with the correct parameters', async () => {
      const foo1 = createObject({
        type: 'foo',
        id: '1',
      });
      const foo2 = createObject({
        type: 'foo',
        id: '2',
      });
      const bar3 = createObject({
        type: 'bar',
        id: '3',
      });

      const fooExportable: SavedObjectsExportablePredicate = jest.fn().mockReturnValue(true);
      registerType('foo', { isExportable: fooExportable });

      const barExportable: SavedObjectsExportablePredicate = jest.fn().mockReturnValue(true);
      registerType('bar', { isExportable: barExportable });

      await collectExportedObjects({
        objects: [foo1, foo2, bar3],
        savedObjectsClient,
        request,
        typeRegistry,
        includeReferences: true,
        logger,
      });

      expect(fooExportable).toHaveBeenCalledTimes(2);
      expect(fooExportable).toHaveBeenCalledWith(foo1);
      expect(fooExportable).toHaveBeenCalledWith(foo2);

      expect(barExportable).toHaveBeenCalledTimes(1);
      expect(barExportable).toHaveBeenCalledWith(bar3);
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

      registerType('foo');
      registerType('bar');
      registerType('dolly');

      applyExportTransformsMock.mockImplementationOnce(({ objects }) => [...objects, dolly3]);
      savedObjectsClient.bulkGet.mockResolvedValueOnce({
        saved_objects: [bar2],
      });

      const { objects, missingRefs } = await collectExportedObjects({
        objects: [foo1],
        savedObjectsClient,
        request,
        typeRegistry,
        includeReferences: true,
        logger,
      });

      expect(missingRefs).toHaveLength(0);
      expect(objects.map(toIdTuple)).toEqual([foo1, dolly3, bar2].map(toIdTuple));
    });

    it('excludes objects filtered by the `isExportable` predicate', async () => {
      const foo1 = createObject({
        type: 'foo',
        id: '1',
      });
      const foo2 = createObject({
        type: 'foo',
        id: '2',
      });
      const bar3 = createObject({
        type: 'bar',
        id: '3',
      });

      registerType('foo', { isExportable: (obj) => obj.id !== '2' });
      registerType('bar', { isExportable: () => true });

      const { objects, excludedObjects } = await collectExportedObjects({
        objects: [foo1, foo2, bar3],
        savedObjectsClient,
        request,
        typeRegistry,
        includeReferences: true,
        logger,
      });

      expect(objects).toEqual([foo1, bar3]);
      expect(excludedObjects).toEqual([foo2].map((obj) => toExcludedObject(obj)));
    });

    it('excludes objects when the predicate throws', async () => {
      const foo1 = createObject({
        type: 'foo',
        id: '1',
      });
      const foo2 = createObject({
        type: 'foo',
        id: '2',
      });
      const bar3 = createObject({
        type: 'bar',
        id: '3',
      });

      registerType('foo', {
        isExportable: (obj) => {
          if (obj.id === '1') {
            throw new Error('reason');
          }
          return true;
        },
      });
      registerType('bar', { isExportable: () => true });

      const { objects, excludedObjects } = await collectExportedObjects({
        objects: [foo1, foo2, bar3],
        savedObjectsClient,
        request,
        typeRegistry,
        includeReferences: true,
        logger,
      });

      expect(objects).toEqual([foo2, bar3]);
      expect(excludedObjects).toEqual(
        [foo1].map((obj) => toExcludedObject(obj, 'predicate_error'))
      );
    });

    it('logs an error for each predicate error', async () => {
      const foo1 = createObject({
        type: 'foo',
        id: '1',
      });
      const foo2 = createObject({
        type: 'foo',
        id: '2',
      });
      const foo3 = createObject({
        type: 'foo',
        id: '3',
      });

      registerType('foo', {
        isExportable: (obj) => {
          if (obj.id !== '2') {
            throw new Error('reason');
          }
          return true;
        },
      });

      const { objects, excludedObjects } = await collectExportedObjects({
        objects: [foo1, foo2, foo3],
        savedObjectsClient,
        request,
        typeRegistry,
        includeReferences: true,
        logger,
      });

      expect(objects).toEqual([foo2]);
      expect(excludedObjects).toEqual(
        [foo1, foo3].map((obj) => toExcludedObject(obj, 'predicate_error'))
      );

      expect(logger.error).toHaveBeenCalledTimes(2);
      const logMessages = logger.error.mock.calls.map((call) => call[0]);

      expect(
        (logMessages[0] as string).startsWith(
          `Error invoking "isExportable" for object foo:1. Error was: Error: reason`
        )
      ).toBe(true);
      expect(
        (logMessages[1] as string).startsWith(
          `Error invoking "isExportable" for object foo:3. Error was: Error: reason`
        )
      ).toBe(true);
    });

    it('excludes references filtered by the `isExportable` predicate', async () => {
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
            type: 'excluded',
            id: '1',
            name: 'excluded-1',
          },
        ],
      });
      const bar2 = createObject({
        type: 'bar',
        id: '2',
      });
      const excluded1 = createObject({
        type: 'excluded',
        id: '1',
      });

      registerType('foo');
      registerType('bar');
      registerType('excluded', { isExportable: () => false });

      savedObjectsClient.bulkGet.mockResolvedValueOnce({
        saved_objects: [bar2, excluded1],
      });

      const { objects, excludedObjects } = await collectExportedObjects({
        objects: [foo1],
        savedObjectsClient,
        request,
        typeRegistry,
        includeReferences: true,
        logger,
      });

      expect(objects).toEqual([foo1, bar2]);
      expect(excludedObjects).toEqual([excluded1].map((obj) => toExcludedObject(obj)));
    });

    it('excludes additional objects filtered by the `isExportable` predicate', async () => {
      const foo1 = createObject({
        type: 'foo',
        id: '1',
      });
      const bar2 = createObject({
        type: 'bar',
        id: '2',
      });
      const excluded1 = createObject({
        type: 'excluded',
        id: '1',
      });

      registerType('foo');
      registerType('bar');
      registerType('excluded', { isExportable: () => false });

      applyExportTransformsMock.mockImplementationOnce(({ objects }) => [
        ...objects,
        bar2,
        excluded1,
      ]);

      const { objects, excludedObjects } = await collectExportedObjects({
        objects: [foo1],
        savedObjectsClient,
        request,
        typeRegistry,
        includeReferences: true,
        logger,
      });

      expect(objects).toEqual([foo1, bar2]);
      expect(excludedObjects).toEqual([excluded1].map((obj) => toExcludedObject(obj)));
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
        typeRegistry,
        includeReferences: true,
        logger,
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
        typeRegistry,
        includeReferences: true,
        logger,
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
        typeRegistry,
        includeReferences: true,
        logger,
      });

      expect(savedObjectsClient.bulkGet).toHaveBeenCalledTimes(1);
      expect(savedObjectsClient.bulkGet).toHaveBeenCalledWith(
        [toIdTuple(bar2)],
        expect.any(Object)
      );

      expect(applyExportTransformsMock).toHaveBeenCalledTimes(2);
      expect(applyExportTransformsMock).toHaveBeenCalledWith({
        objects: [foo1],
        transforms: toMap({}),
        request,
      });
      expect(applyExportTransformsMock).toHaveBeenCalledWith({
        objects: [bar2],
        transforms: toMap({}),
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
        typeRegistry,
        includeReferences: true,
        logger,
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
        typeRegistry,
        includeReferences: true,
        logger,
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
        typeRegistry,
        includeReferences: true,
        logger,
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
        typeRegistry,
        includeReferences: true,
        logger,
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

    it('excludes references filtered by the `isExportable` predicate for additional objects returned by the export transform', async () => {
      const foo1 = createObject({
        type: 'foo',
        id: '1',
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
          {
            type: 'baz',
            id: '4',
            name: 'baz-4',
          },
        ],
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

      registerType('foo');
      registerType('bar');
      registerType('dolly');
      registerType('baz', { isExportable: () => false });

      applyExportTransformsMock.mockImplementationOnce(({ objects }) => [...objects, bar2]);

      savedObjectsClient.bulkGet.mockResolvedValueOnce({
        saved_objects: [dolly3, baz4],
      });

      const { objects, excludedObjects } = await collectExportedObjects({
        objects: [foo1],
        savedObjectsClient,
        request,
        typeRegistry,
        includeReferences: true,
        logger,
      });

      expect(objects).toEqual([foo1, bar2, dolly3]);
      expect(excludedObjects).toEqual([baz4].map((obj) => toExcludedObject(obj)));
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
        typeRegistry,
        includeReferences: false,
        logger,
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
