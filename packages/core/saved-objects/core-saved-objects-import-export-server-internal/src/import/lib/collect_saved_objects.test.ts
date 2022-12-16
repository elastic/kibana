/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Readable, PassThrough } from 'stream';
import { SavedObjectsImportError } from '../errors';
import { collectSavedObjects } from './collect_saved_objects';
import { createLimitStream } from './create_limit_stream';
import { getNonUniqueEntries } from './get_non_unique_entries';

jest.mock('./create_limit_stream');
jest.mock('./get_non_unique_entries');

const getMockFn = <T extends (...args: any[]) => any, U>(fn: (...args: Parameters<T>) => U) =>
  fn as jest.MockedFunction<(...args: Parameters<T>) => U>;

let limitStreamPush: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  const stream = new PassThrough({ objectMode: true });
  limitStreamPush = jest.spyOn(stream, 'push');
  getMockFn(createLimitStream).mockReturnValue(stream);
  getMockFn(getNonUniqueEntries).mockReturnValue([]);
});

describe('collectSavedObjects()', () => {
  const objectLimit = 10;
  const createReadStream = (...args: any[]) =>
    new Readable({
      objectMode: true,
      read() {
        args.forEach((arg) => this.push(arg));
        this.push(null);
      },
    });

  const obj1 = {
    type: 'a',
    id: '1',
    attributes: { title: 'my title 1' },
    references: [{ type: 'b', id: '2', name: 'b2' }],
  };
  const obj2 = {
    type: 'b',
    id: '2',
    attributes: { title: 'my title 2' },
    references: [{ type: 'c', id: '3', name: 'c3' }],
  };

  describe('module calls', () => {
    test('limit stream with empty input stream is called with null', async () => {
      const readStream = createReadStream();
      await collectSavedObjects({ readStream, supportedTypes: [], objectLimit });

      expect(createLimitStream).toHaveBeenCalledWith(objectLimit);
      expect(limitStreamPush).toHaveBeenCalledTimes(1);
      expect(limitStreamPush).toHaveBeenLastCalledWith(null);
    });

    test('limit stream with non-empty input stream is called with all objects', async () => {
      const readStream = createReadStream(obj1, obj2);
      const supportedTypes = [obj2.type];
      await collectSavedObjects({ readStream, supportedTypes, objectLimit });

      expect(createLimitStream).toHaveBeenCalledWith(objectLimit);
      expect(limitStreamPush).toHaveBeenCalledTimes(3);
      expect(limitStreamPush).toHaveBeenNthCalledWith(1, obj1);
      expect(limitStreamPush).toHaveBeenNthCalledWith(2, obj2);
      expect(limitStreamPush).toHaveBeenLastCalledWith(null);
    });

    test('get non-unique entries with empty input stream is called with empty array', async () => {
      const readStream = createReadStream();
      await collectSavedObjects({ readStream, supportedTypes: [], objectLimit });

      expect(getNonUniqueEntries).toHaveBeenCalledWith([]);
    });

    test('get non-unique entries with non-empty input stream is called with all entries', async () => {
      const readStream = createReadStream(obj1, obj2);
      const supportedTypes = [obj2.type];
      await collectSavedObjects({ readStream, supportedTypes, objectLimit });

      expect(getNonUniqueEntries).toHaveBeenCalledWith([
        { type: obj1.type, id: obj1.id },
        { type: obj2.type, id: obj2.id },
      ]);
    });

    test('filter with empty input stream is not called', async () => {
      const readStream = createReadStream();
      const filter = jest.fn();
      await collectSavedObjects({ readStream, supportedTypes: [], objectLimit, filter });

      expect(filter).not.toHaveBeenCalled();
    });

    test('filter with non-empty input stream is called with all objects of supported types', async () => {
      const readStream = createReadStream(obj1, obj2);
      const filter = jest.fn();
      const supportedTypes = [obj2.type];
      await collectSavedObjects({ readStream, supportedTypes, objectLimit, filter });

      expect(filter).toHaveBeenCalledTimes(1);
      expect(filter).toHaveBeenCalledWith(obj2);
    });
  });

  describe('results', () => {
    test('throws import error if any import objects are not unique', async () => {
      getMockFn(getNonUniqueEntries).mockReturnValue(['type1:id1', 'type2:id2']);
      const readStream = createReadStream();
      expect.assertions(2);
      try {
        await collectSavedObjects({ readStream, supportedTypes: [], objectLimit });
      } catch (e) {
        expect(e).toBeInstanceOf(SavedObjectsImportError);
        expect(e.message).toMatchInlineSnapshot(
          `"Non-unique import objects detected: [type1:id1,type2:id2]"`
        );
      }
    });

    test('collects nothing when stream is empty', async () => {
      const readStream = createReadStream();
      const result = await collectSavedObjects({ readStream, supportedTypes: [], objectLimit });

      expect(result).toEqual({ collectedObjects: [], errors: [], importStateMap: new Map() });
    });

    test('collects objects from stream', async () => {
      const readStream = createReadStream(obj1, obj2);
      const supportedTypes = [obj1.type, obj2.type];
      const result = await collectSavedObjects({ readStream, supportedTypes, objectLimit });

      const collectedObjects = [
        { ...obj1, migrationVersion: {} },
        { ...obj2, migrationVersion: {} },
      ];
      const importStateMap = new Map([
        [`a:1`, {}], // a:1 is included because it is present in the collected objects
        [`b:2`, {}], // b:2 is included because it is present in the collected objects
        [`c:3`, { isOnlyReference: true }], // c:3 is included because b:2 has a reference to c:3, but this is marked as `isOnlyReference` because c:3 is not present in the collected objects
      ]);
      expect(result).toEqual({ collectedObjects, errors: [], importStateMap });
    });

    test('unsupported types return as import errors', async () => {
      const readStream = createReadStream(obj1);
      const supportedTypes = ['not-obj1-type'];
      const result = await collectSavedObjects({ readStream, supportedTypes, objectLimit });

      const error = { type: 'unsupported_type' };
      const { title } = obj1.attributes;
      const errors = [{ error, type: obj1.type, id: obj1.id, meta: { title } }];
      expect(result).toEqual({ collectedObjects: [], errors, importStateMap: new Map() });
    });

    test('returns mixed results', async () => {
      const readStream = createReadStream(obj1, obj2);
      const supportedTypes = [obj1.type];
      const result = await collectSavedObjects({ readStream, supportedTypes, objectLimit });

      const collectedObjects = [{ ...obj1, migrationVersion: {} }];
      const importStateMap = new Map([
        [`a:1`, {}], // a:1 is included because it is present in the collected objects
        [`b:2`, { isOnlyReference: true }], // b:2 was filtered out due to an unsupported type; b:2 is included because a:1 has a reference to b:2, but this is marked as `isOnlyReference` because b:2 is not present in the collected objects
        // c:3 is not included at all, because b:2 was filtered out and there are no other references to c:3
      ]);
      const error = { type: 'unsupported_type' };
      const { title } = obj2.attributes;
      const errors = [{ error, type: obj2.type, id: obj2.id, meta: { title } }];
      expect(result).toEqual({ collectedObjects, errors, importStateMap });
    });

    describe('with optional filter', () => {
      test('filters out objects when result === false', async () => {
        const readStream = createReadStream(obj1, obj2);
        const filter = jest.fn().mockReturnValue(false);
        const supportedTypes = [obj2.type];
        const result = await collectSavedObjects({
          readStream,
          supportedTypes,
          objectLimit,
          filter,
        });

        const error = { type: 'unsupported_type' };
        const { title } = obj1.attributes;
        const errors = [{ error, type: obj1.type, id: obj1.id, meta: { title } }];
        expect(result).toEqual({ collectedObjects: [], errors, importStateMap: new Map() });
      });

      test('does not filter out objects when result === true', async () => {
        const readStream = createReadStream(obj1, obj2);
        const filter = jest.fn().mockReturnValue(true);
        const supportedTypes = [obj2.type];
        const result = await collectSavedObjects({
          readStream,
          supportedTypes,
          objectLimit,
          filter,
        });

        const collectedObjects = [{ ...obj2, migrationVersion: {} }];
        const importStateMap = new Map([
          // a:1 was filtered out due to an unsupported type; a:1 is not included because there are no other references to a:1
          [`b:2`, {}], // b:2 is included because it is present in the collected objects
          [`c:3`, { isOnlyReference: true }], // c:3 is included because b:2 has a reference to c:3, but this is marked as `isOnlyReference` because c:3 is not present in the collected objects
        ]);
        const error = { type: 'unsupported_type' };
        const { title } = obj1.attributes;
        const errors = [{ error, type: obj1.type, id: obj1.id, meta: { title } }];
        expect(result).toEqual({ collectedObjects, errors, importStateMap });
      });
    });
  });
});
