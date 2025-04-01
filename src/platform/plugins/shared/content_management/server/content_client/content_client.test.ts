/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ContentCrud } from '../core/crud';
import { EventBus } from '../core/event_bus';
import { createMemoryStorage, type FooContent } from '../core/mocks';
import { ContentClient } from './content_client';

describe('ContentClient', () => {
  const setup = ({
    contentTypeId = 'foo',
  }: {
    contentTypeId?: string;
  } = {}) => {
    const storage = createMemoryStorage();
    const eventBus = new EventBus();
    const crudInstance = new ContentCrud<FooContent>(contentTypeId, storage, { eventBus });

    const contentClient = ContentClient.create(contentTypeId, {
      crudInstance,
      storageContext: {} as any,
    });

    return { contentClient };
  };

  describe('instance', () => {
    test('should throw an Error if instantiate using constructor', () => {
      const expectToThrow = () => {
        new ContentClient(Symbol('foo'), 'foo', {} as any);
      };
      expect(expectToThrow).toThrowError('Use ContentClient.create() instead');
    });

    test('should have contentTypeId', () => {
      const { contentClient } = setup({ contentTypeId: 'hellooo' });
      expect(contentClient.contentTypeId).toBe('hellooo');
    });

    test('should throw if crudInstance is not an instance of ContentCrud', () => {
      const expectToThrow = () => {
        ContentClient.create('foo', {
          crudInstance: {} as any,
          storageContext: {} as any,
        });
      };
      // With this test and runtime check we can rely on all the existing tests of the Content Crud.
      // e.g. the tests about events being dispatched, etc.
      expect(expectToThrow).toThrowError('Crud instance missing or not an instance of ContentCrud');
    });
  });

  describe('Crud', () => {
    describe('create()', () => {
      test('should create an item', async () => {
        const { contentClient } = setup();
        const itemCreated = await contentClient.create({ foo: 'bar' });
        const { id } = itemCreated.result.item;
        const res = await contentClient.get(id);
        expect(res.result.item).toEqual({ foo: 'bar', id });
      });

      test('should pass the options to the storage', async () => {
        const { contentClient } = setup();

        const options = { forwardInResponse: { option1: 'foo' } };
        const res = await contentClient.create({ field1: 123 }, options);
        expect(res.result.item).toEqual({
          field1: 123,
          id: expect.any(String),
          options: { option1: 'foo' }, // the options have correctly been passed to the storage
        });
      });
    });

    describe('get()', () => {
      // Note: we test the client get() method in multiple other tests for
      // the "create()" and "update()" methods, no need for extended tests here.
      test('should return undefined if no item was found', async () => {
        const { contentClient } = setup();
        const res = await contentClient.get('hello');
        expect(res.result.item).toBeUndefined();
      });

      test('should pass the options to the storage', async () => {
        const { contentClient } = setup();

        const options = { forwardInResponse: { foo: 'bar' } };
        const res = await contentClient.get('hello', options);

        expect(res.result.item).toEqual({
          // the options have correctly been passed to the storage
          options: { foo: 'bar' },
        });
      });
    });

    describe('bulkGet()', () => {
      test('should return multiple items', async () => {
        const { contentClient } = setup();

        const item1 = await contentClient.create({ name: 'item1' });
        const item2 = await contentClient.create({ name: 'item2' });
        const ids = [item1.result.item.id, item2.result.item.id];

        const res = await contentClient.bulkGet(ids);
        expect(res.result.hits).toEqual([
          {
            item: {
              name: 'item1',
              id: expect.any(String),
            },
          },
          {
            item: {
              name: 'item2',
              id: expect.any(String),
            },
          },
        ]);
      });

      test('should pass the options to the storage', async () => {
        const { contentClient } = setup();

        const item1 = await contentClient.create({ name: 'item1' });
        const item2 = await contentClient.create({ name: 'item2' });
        const ids = [item1.result.item.id, item2.result.item.id];

        const options = { forwardInResponse: { foo: 'bar' } };
        const res = await contentClient.bulkGet(ids, options);

        expect(res.result.hits).toEqual([
          {
            item: {
              name: 'item1',
              id: expect.any(String),
              options: { foo: 'bar' }, // the options have correctly been passed to the storage
            },
          },
          {
            item: {
              name: 'item2',
              id: expect.any(String),
              options: { foo: 'bar' }, // the options have correctly been passed to the storage
            },
          },
        ]);
      });
    });

    describe('update()', () => {
      test('should update an item', async () => {
        const { contentClient } = setup();
        const itemCreated = await contentClient.create({ foo: 'bar' });
        const { id } = itemCreated.result.item;

        await contentClient.update(id, { foo: 'changed' });

        const res = await contentClient.get(id);
        expect(res.result.item).toEqual({ foo: 'changed', id });
      });

      test('should pass the options to the storage', async () => {
        const { contentClient } = setup();
        const itemCreated = await contentClient.create({ field1: 'bar' });
        const { id } = itemCreated.result.item;

        const options = { forwardInResponse: { option1: 'foo' } };
        const res = await contentClient.update(id, { field1: 'changed' }, options);

        expect(res.result.item).toEqual({
          field1: 'changed',
          id,
          options: { option1: 'foo' }, // the options have correctly been passed to the storage
        });
      });
    });

    describe('delete()', () => {
      test('should delete an item', async () => {
        const { contentClient } = setup();
        const itemCreated = await contentClient.create({ foo: 'bar' });
        const { id } = itemCreated.result.item;

        {
          const res = await contentClient.get(id);
          expect(res.result.item).not.toBeUndefined();
        }

        await contentClient.delete(id);

        {
          const res = await contentClient.get(id);
          expect(res.result.item).toBeUndefined();
        }
      });

      test('should pass the options to the storage', async () => {
        const { contentClient } = setup();
        const itemCreated = await contentClient.create({ field1: 'bar' });
        const { id } = itemCreated.result.item;

        const options = { forwardInResponse: { option1: 'foo' } };

        const res = await contentClient.delete(id, options);

        expect(res.result).toEqual({
          success: true,
          options: { option1: 'foo' }, // the options have correctly been passed to the storage
        });
      });
    });

    describe('search()', () => {
      test('should find an item', async () => {
        const { contentClient } = setup();

        await contentClient.create({ title: 'hello' });

        const res = await contentClient.search({ text: 'hello' });

        expect(res.result).toEqual({
          hits: [
            {
              id: expect.any(String),
              title: 'hello',
            },
          ],
          pagination: {
            cursor: '',
            total: 1,
          },
        });
      });

      test('should pass the options to the storage', async () => {
        const { contentClient } = setup();
        await contentClient.create({ title: 'hello' });

        const options = { forwardInResponse: { option1: 'foo' } };
        const res = await contentClient.search({ text: 'hello' }, options);

        expect(res.result).toEqual({
          hits: [
            {
              id: expect.any(String),
              title: 'hello',
              options: { option1: 'foo' }, // the options have correctly been passed to the storage
            },
          ],
          pagination: {
            cursor: '',
            total: 1,
          },
        });
      });
    });
  });
});
