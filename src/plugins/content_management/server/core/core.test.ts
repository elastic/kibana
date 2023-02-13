/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { ContentConfig } from './types';
import { Core } from './core';
import { createMemoryStorage, MockContent } from './mocks';
import { ContentRegistry } from './registry';
import { ContentCrud } from './crud';
import type {
  GetItemStart,
  GetItemSuccess,
  GetItemError,
  CreateItemStart,
  CreateItemSuccess,
  CreateItemError,
  UpdateItemStart,
  UpdateItemSuccess,
  UpdateItemError,
  DeleteItemStart,
  DeleteItemSuccess,
  DeleteItemError,
} from './event_types';
import { EventBus } from './event_bus';

const logger = loggingSystemMock.createLogger();

describe('Content Core', () => {
  describe('setup()', () => {
    let core: Core;
    let coreSetup: ReturnType<Core['setup']>;
    let contentConfig: ContentConfig;

    beforeEach(() => {
      core = new Core({ logger });
      coreSetup = core.setup();
      contentConfig = {
        storage: createMemoryStorage(),
      };
    });

    afterEach(() => {
      // Remove subscription of the events$
      coreSetup.api.eventBus.stop();
    });

    test('should return the registry and the public api', () => {
      expect(coreSetup.contentRegistry).toBeInstanceOf(ContentRegistry);
      expect(Object.keys(coreSetup.api).sort()).toEqual(['crud', 'eventBus', 'register']);
    });

    describe('api', () => {
      const CONTENT_TYPE = 'foo';
      const ctx = {};

      describe('register()', () => {
        test('should expose the register handler from the registry instance', () => {
          const {
            contentRegistry,
            api: { register },
          } = coreSetup;

          expect(contentRegistry.isContentRegistered('foo')).toBe(false);

          register('foo', contentConfig);

          // Make sure the "register" exposed by the api is indeed registring
          // the content into our "contentRegistry" instance
          expect(contentRegistry.isContentRegistered('foo')).toBe(true);
          expect(contentRegistry.getConfig('foo')).toBe(contentConfig);
        });
      });

      describe('crud()', () => {
        let contentCrud: ContentCrud;

        beforeEach(() => {
          const {
            api: { register, crud },
          } = coreSetup;
          register(CONTENT_TYPE, contentConfig);
          contentCrud = crud(CONTENT_TYPE);
        });

        test('get()', async () => {
          const res = await contentCrud.get(ctx, '1');
          expect(res).toBeUndefined();
        });

        test('get() - options are forwared to storage layer', async () => {
          const res = await contentCrud.get(ctx, '1', { forwardInResponse: { foo: 'bar' } });
          expect(res).toEqual({
            // Options forwared in response
            options: { foo: 'bar' },
          });
        });

        test('create()', async () => {
          const res = await contentCrud.get(ctx, '1234');
          expect(res).toBeUndefined();
          await contentCrud.create<Omit<MockContent, 'id'>, { id: string }>(
            ctx,
            { title: 'Hello' },
            { id: '1234' } // We send this "id" option to specify the id of the content created
          );
          expect(contentCrud.get(ctx, '1234')).resolves.toEqual({ id: '1234', title: 'Hello' });
        });

        test('update()', async () => {
          await contentCrud.create<Omit<MockContent, 'id'>, { id: string }>(
            ctx,
            { title: 'Hello' },
            { id: '1234' }
          );
          await contentCrud.update<Omit<MockContent, 'id'>>(ctx, '1234', { title: 'changed' });
          expect(contentCrud.get(ctx, '1234')).resolves.toEqual({ id: '1234', title: 'changed' });
        });

        test('update() - options are forwared to storage layer', async () => {
          await contentCrud.create<Omit<MockContent, 'id'>, { id: string }>(
            ctx,
            { title: 'Hello' },
            { id: '1234' }
          );
          const res = await contentCrud.update<Omit<MockContent, 'id'>>(
            ctx,
            '1234',
            { title: 'changed' },
            { forwardInResponse: { foo: 'bar' } }
          );

          expect(res).toEqual({
            id: '1234',
            title: 'changed',
            // Options forwared in response
            options: { foo: 'bar' },
          });

          expect(contentCrud.get(ctx, '1234')).resolves.toEqual({
            id: '1234',
            title: 'changed',
          });
        });

        test('delete()', async () => {
          await contentCrud.create<Omit<MockContent, 'id'>, { id: string }>(
            ctx,
            { title: 'Hello' },
            { id: '1234' }
          );
          expect(contentCrud.get(ctx, '1234')).resolves.not.toBeUndefined();
          await contentCrud.delete(ctx, '1234');
          expect(contentCrud.get(ctx, '1234')).resolves.toBeUndefined();
        });

        test('delete() - options are forwared to storage layer', async () => {
          await contentCrud.create<Omit<MockContent, 'id'>, { id: string }>(
            ctx,
            { title: 'Hello' },
            { id: '1234' }
          );
          const res = await contentCrud.delete(ctx, '1234', { forwardInResponse: { foo: 'bar' } });
          expect(res).toMatchObject({ options: { foo: 'bar' } });
        });
      });

      describe('eventBus', () => {
        test('should allow to emit and subscribe to events', () => {
          const {
            api: { eventBus },
          } = coreSetup;

          const listener = jest.fn();
          const subscription = eventBus.events$.subscribe(listener);

          const event: GetItemStart = {
            type: 'getItemStart',
            contentId: '123',
            contentType: 'foo',
          };
          eventBus.emit(event);

          expect(listener).toHaveBeenCalledWith(event);
          subscription.unsubscribe();
        });

        test('should allow to subscribe to a single event', () => {
          const {
            api: { eventBus },
          } = coreSetup;

          const listener = jest.fn();
          // Listen to all "getItemStart" events, regardless of the content type
          const unsubscribe = eventBus.on('getItemStart', listener);

          const event: GetItemStart = {
            type: 'getItemStart',
            contentId: '123',
            contentType: 'foo',
          };
          eventBus.emit(event);

          expect(listener).toHaveBeenCalledWith(event);

          // Test the returned unsubscribe() handler
          listener.mockReset();
          unsubscribe();

          eventBus.emit(event);
          expect(listener).not.toHaveBeenCalledWith(event);
        });

        test('should validate that the content type is registered when subscribing to single event with content type', () => {
          const {
            api: { eventBus },
          } = coreSetup;

          expect(() => { eventBus.on('getItemStart', 'foo', jest.fn()) }).toThrow(
            'Invalid content type [foo].'
          );
        });

        test('should allow to subscribe to a single event for a single content type', async () => {
          const {
            api: { eventBus, register, crud },
          } = coreSetup;

          register(CONTENT_TYPE, contentConfig);

          await crud(CONTENT_TYPE).create<Omit<MockContent, 'id'>, { id: string }>(
            ctx,
            { title: 'Hello' },
            { id: '1234' }
          );

          const listener = jest.fn();

          // Listen to "getItemStart" events *only* on the "foo" content type
          eventBus.on('getItemStart', CONTENT_TYPE, listener);

          let event: GetItemStart = {
            type: 'getItemStart',
            contentId: '123',
            contentType: 'other', // other type should not call listener
          };
          eventBus.emit(event);

          expect(listener).not.toHaveBeenCalledWith(event);

          event = {
            type: 'getItemStart',
            contentId: '123',
            contentType: 'foo',
          };
          eventBus.emit(event);

          expect(listener).toHaveBeenCalledWith(event);
        });

        describe('crud operations should emit start|success|error events', () => {
          let contentCrud: ContentCrud;
          let eventBus: EventBus;

          beforeEach(() => {
            const {
              api: { register, crud, eventBus: _eventBus },
            } = coreSetup;
            register(CONTENT_TYPE, contentConfig);
            contentCrud = crud(CONTENT_TYPE);
            eventBus = _eventBus;
          });

          test('get()', async () => {
            const data = { title: 'Hello' };

            await contentCrud.create<Omit<MockContent, 'id'>, { id: string }>(ctx, data, {
              id: '1234',
            });

            const listener = jest.fn();
            const sub = eventBus.events$.subscribe(listener);

            const promise = contentCrud.get(ctx, '1234', { someOption: 'baz' });

            const getItemStart: GetItemStart = {
              type: 'getItemStart',
              contentId: '1234',
              contentType: CONTENT_TYPE,
              options: { someOption: 'baz' },
            };

            expect(listener).toHaveBeenCalledWith(getItemStart);

            await promise;

            const getItemSuccess: GetItemSuccess = {
              type: 'getItemSuccess',
              contentId: '1234',
              data: {
                id: '1234',
                ...data,
              },
              contentType: CONTENT_TYPE,
            };

            expect(listener).toHaveBeenCalledWith(getItemSuccess);

            listener.mockReset();

            const errorMessage = 'Ohhh no!';
            const reject = jest.fn();
            await contentCrud.get(ctx, '1234', { errorToThrow: errorMessage }).catch(reject);

            const getItemError: GetItemError = {
              type: 'getItemError',
              contentId: '1234',
              contentType: CONTENT_TYPE,
              error: errorMessage,
              options: { errorToThrow: errorMessage },
            };

            expect(listener).toHaveBeenLastCalledWith(getItemError);

            expect(reject).toHaveBeenCalledWith(new Error(errorMessage));

            sub.unsubscribe();
          });

          test('create()', async () => {
            const data = { title: 'Hello' };

            const listener = jest.fn();
            const sub = eventBus.events$.subscribe(listener);

            const promise = contentCrud.create<Omit<MockContent, 'id'>, { id: string }>(ctx, data, {
              id: '1234',
            });

            const createItemStart: CreateItemStart = {
              type: 'createItemStart',
              contentType: CONTENT_TYPE,
              data,
              options: { id: '1234' },
            };

            expect(listener).toHaveBeenCalledWith(createItemStart);

            await promise;

            const createItemSuccess: CreateItemSuccess = {
              type: 'createItemSuccess',
              data: {
                id: '1234',
                ...data,
              },
              contentType: CONTENT_TYPE,
              options: { id: '1234' },
            };

            expect(listener).toHaveBeenCalledWith(createItemSuccess);

            listener.mockReset();

            const errorMessage = 'Ohhh no!';
            const reject = jest.fn();
            await contentCrud
              .create<Omit<MockContent, 'id'>, { id: string; errorToThrow: string }>(ctx, data, {
                id: '1234',
                errorToThrow: errorMessage,
              })
              .catch(reject);

            const createItemError: CreateItemError = {
              type: 'createItemError',
              contentType: CONTENT_TYPE,
              data,
              error: errorMessage,
              options: { id: '1234', errorToThrow: errorMessage },
            };

            expect(listener).toHaveBeenLastCalledWith(createItemError);

            expect(reject).toHaveBeenCalledWith(new Error(errorMessage));

            sub.unsubscribe();
          });

          test('update()', async () => {
            await contentCrud.create<Omit<MockContent, 'id'>, { id: string }>(
              ctx,
              { title: 'Hello' },
              {
                id: '1234',
              }
            );

            const listener = jest.fn();
            const sub = eventBus.events$.subscribe(listener);

            const data = { title: 'Updated' };

            const promise = await contentCrud.update(ctx, '1234', data, { someOptions: 'baz' });

            const updateItemStart: UpdateItemStart = {
              type: 'updateItemStart',
              contentId: '1234',
              contentType: CONTENT_TYPE,
              data,
              options: { someOptions: 'baz' },
            };

            expect(listener).toHaveBeenCalledWith(updateItemStart);

            await promise;

            const updateItemSuccess: UpdateItemSuccess = {
              type: 'updateItemSuccess',
              contentId: '1234',
              contentType: CONTENT_TYPE,
              data: {
                id: '1234',
                ...data,
              },
              options: { someOptions: 'baz' },
            };

            expect(listener).toHaveBeenCalledWith(updateItemSuccess);

            listener.mockReset();

            const errorMessage = 'Ohhh no!';
            const reject = jest.fn();
            await contentCrud
              .update(ctx, '1234', data, {
                errorToThrow: errorMessage,
              })
              .catch(reject);

            const updateItemError: UpdateItemError = {
              type: 'updateItemError',
              contentType: CONTENT_TYPE,
              contentId: '1234',
              data,
              error: errorMessage,
              options: { errorToThrow: errorMessage },
            };

            expect(listener).toHaveBeenLastCalledWith(updateItemError);

            expect(reject).toHaveBeenCalledWith(new Error(errorMessage));

            sub.unsubscribe();
          });

          test('delete()', async () => {
            await contentCrud.create<Omit<MockContent, 'id'>, { id: string }>(
              ctx,
              { title: 'Hello' },
              {
                id: '1234',
              }
            );

            const listener = jest.fn();
            const sub = eventBus.events$.subscribe(listener);

            const promise = await contentCrud.delete(ctx, '1234', { someOptions: 'baz' });

            const deleteItemStart: DeleteItemStart = {
              type: 'deleteItemStart',
              contentId: '1234',
              contentType: CONTENT_TYPE,
              options: { someOptions: 'baz' },
            };

            expect(listener).toHaveBeenCalledWith(deleteItemStart);

            await promise;

            const deleteItemSuccess: DeleteItemSuccess = {
              type: 'deleteItemSuccess',
              contentId: '1234',
              contentType: CONTENT_TYPE,
              options: { someOptions: 'baz' },
            };

            expect(listener).toHaveBeenCalledWith(deleteItemSuccess);

            listener.mockReset();

            const errorMessage = 'Ohhh no!';
            const reject = jest.fn();
            await contentCrud
              .delete(ctx, '1234', {
                errorToThrow: errorMessage,
              })
              .catch(reject);

            const deleteItemError: DeleteItemError = {
              type: 'deleteItemError',
              contentType: CONTENT_TYPE,
              contentId: '1234',
              error: errorMessage,
              options: { errorToThrow: errorMessage },
            };

            expect(listener).toHaveBeenLastCalledWith(deleteItemError);

            expect(reject).toHaveBeenCalledWith(new Error(errorMessage));

            sub.unsubscribe();
          });
        });
      });
    });
  });
});
