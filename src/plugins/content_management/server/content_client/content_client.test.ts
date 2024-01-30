/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { ContentCrud } from '../core/crud';
import { EventBus } from '../core/event_bus';
import { createMemoryStorage } from '../core/mocks';
import { ContentClient } from './content_client';

describe('ContentClient', () => {
  const setup = (contentTypeId = 'foo') => {
    const storage = createMemoryStorage();
    const eventBus = new EventBus();
    const crudInstance = new ContentCrud<any>(contentTypeId, storage, { eventBus });

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
      const { contentClient } = setup('hellooo');
      expect(contentClient.contentTypeId).toBe('hellooo');
    });
  });

  describe('Crud', () => {
    describe('get()', () => {
      test('get()', async () => {
        const { contentClient } = setup();
        const res = await contentClient.get('hello');
        console.log(JSON.stringify(res, null, 2));
        expect(res.result.item).toBeUndefined();
      });

      test('should pass the options to the storage', async () => {
        const { contentClient } = setup();

        const options = { forwardInResponse: { foo: 'bar' } };
        const res = await contentClient.get('hello', options);

        expect(res.result.item).toEqual({ options: { foo: 'bar' } });
      });
    });
  });
});
