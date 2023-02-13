/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { loggingSystemMock } from '@kbn/core/server/mocks';
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

const logger = loggingSystemMock.createLogger();

const setup = ({ registerFooType = false }: { registerFooType?: boolean } = {}) => {
  const FOO_CONTENT_ID = 'foo';
  const ctx = {};

  const core = new Core({ logger });
  const coreSetup = core.setup();
  const contentConfig = {
    storage: createMemoryStorage(),
  };
  const cleanUp = () => {
    coreSetup.api.eventBus.stop();
  };

  let fooContentCrud: ContentCrud | undefined;

  if (registerFooType) {
    coreSetup.api.register(FOO_CONTENT_ID, contentConfig);
    fooContentCrud = coreSetup.api.crud(FOO_CONTENT_ID);
  }

  return {
    core,
    coreSetup,
    contentConfig,
    FOO_CONTENT_ID,
    ctx,
    fooContentCrud,
    cleanUp,
    eventBus: coreSetup.api.eventBus,
  };
};

describe('Content Core', () => {
  describe('setup()', () => {
    test('should return the registry and the public api', () => {
      const { coreSetup, cleanUp } = setup();

      expect(coreSetup.contentRegistry).toBeInstanceOf(ContentRegistry);
      expect(Object.keys(coreSetup.api).sort()).toEqual(['crud', 'eventBus', 'register']);

      cleanUp();
    });

    describe('api', () => {
      describe('register()', () => {
        test('should expose the register handler from the registry instance', () => {
          const { coreSetup, cleanUp, contentConfig } = setup();

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

          cleanUp();
        });
      });

      describe('crud()', () => {
        test('get()', async () => {
          const { fooContentCrud, ctx, cleanUp } = setup({ registerFooType: true });

          const res = await fooContentCrud!.get(ctx, '1');
          expect(res).toBeUndefined();

          cleanUp();
        });

        test('get() - options are forwared to storage layer', async () => {
          const { fooContentCrud, ctx, cleanUp } = setup({ registerFooType: true });

          const res = await fooContentCrud!.get(ctx, '1', { forwardInResponse: { foo: 'bar' } });
          expect(res).toEqual({
            // Options forwared in response
            options: { foo: 'bar' },
          });

          cleanUp();
        });

        test('create()', async () => {
          const { fooContentCrud, ctx, cleanUp } = setup({ registerFooType: true });

          const res = await fooContentCrud!.get(ctx, '1234');
          expect(res).toBeUndefined();
          await fooContentCrud!.create<Omit<MockContent, 'id'>, { id: string }>(
            ctx,
            { title: 'Hello' },
            { id: '1234' } // We send this "id" option to specify the id of the content created
          );
          expect(fooContentCrud!.get(ctx, '1234')).resolves.toEqual({ id: '1234', title: 'Hello' });

          cleanUp();
        });

        test('update()', async () => {
          const { fooContentCrud, ctx, cleanUp } = setup({ registerFooType: true });

          await fooContentCrud!.create<Omit<MockContent, 'id'>, { id: string }>(
            ctx,
            { title: 'Hello' },
            { id: '1234' }
          );
          await fooContentCrud!.update<Omit<MockContent, 'id'>>(ctx, '1234', { title: 'changed' });
          expect(fooContentCrud!.get(ctx, '1234')).resolves.toEqual({
            id: '1234',
            title: 'changed',
          });

          cleanUp();
        });

        test('update() - options are forwared to storage layer', async () => {
          const { fooContentCrud, ctx, cleanUp } = setup({ registerFooType: true });

          await fooContentCrud!.create<Omit<MockContent, 'id'>, { id: string }>(
            ctx,
            { title: 'Hello' },
            { id: '1234' }
          );
          const res = await fooContentCrud!.update<Omit<MockContent, 'id'>>(
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

          expect(fooContentCrud!.get(ctx, '1234')).resolves.toEqual({
            id: '1234',
            title: 'changed',
          });

          cleanUp();
        });

        test('delete()', async () => {
          const { fooContentCrud, ctx, cleanUp } = setup({ registerFooType: true });

          await fooContentCrud!.create<Omit<MockContent, 'id'>, { id: string }>(
            ctx,
            { title: 'Hello' },
            { id: '1234' }
          );
          expect(fooContentCrud!.get(ctx, '1234')).resolves.not.toBeUndefined();
          await fooContentCrud!.delete(ctx, '1234');
          expect(fooContentCrud!.get(ctx, '1234')).resolves.toBeUndefined();

          cleanUp();
        });

        test('delete() - options are forwared to storage layer', async () => {
          const { fooContentCrud, ctx, cleanUp } = setup({ registerFooType: true });

          await fooContentCrud!.create<Omit<MockContent, 'id'>, { id: string }>(
            ctx,
            { title: 'Hello' },
            { id: '1234' }
          );
          const res = await fooContentCrud!.delete(ctx, '1234', {
            forwardInResponse: { foo: 'bar' },
          });
          expect(res).toMatchObject({ options: { foo: 'bar' } });

          cleanUp();
        });
      });

      describe('eventBus', () => {
        test('should allow to emit and subscribe to events', () => {
          const { coreSetup, cleanUp } = setup();

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

          cleanUp();
        });

        test('should allow to subscribe to a single event', () => {
          const { coreSetup, cleanUp } = setup();

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

          cleanUp();
        });

        test('should validate that the content type is registered when subscribing to single event with content type', () => {
          const { coreSetup, cleanUp } = setup();

          const {
            api: { eventBus },
          } = coreSetup;

          expect(() => {
            eventBus.on('getItemStart', 'foo', jest.fn());
          }).toThrow('Invalid content type [foo].');

          cleanUp();
        });

        test('should allow to subscribe to a single event for a single content type', async () => {
          const { coreSetup, ctx, contentConfig, FOO_CONTENT_ID, cleanUp } = setup();

          const {
            api: { eventBus, register, crud },
          } = coreSetup;

          register(FOO_CONTENT_ID, contentConfig);

          await crud(FOO_CONTENT_ID).create<Omit<MockContent, 'id'>, { id: string }>(
            ctx,
            { title: 'Hello' },
            { id: '1234' }
          );

          const listener = jest.fn();

          // Listen to "getItemStart" events *only* on the "foo" content type
          eventBus.on('getItemStart', FOO_CONTENT_ID, listener);

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

          cleanUp();
        });

        describe('crud operations should emit start|success|error events', () => {
          test('get()', async () => {
            const { fooContentCrud, eventBus, ctx, FOO_CONTENT_ID, cleanUp } = setup({
              registerFooType: true,
            });

            const data = { title: 'Hello' };

            await fooContentCrud!.create<Omit<MockContent, 'id'>, { id: string }>(ctx, data, {
              id: '1234',
            });

            const listener = jest.fn();
            const sub = eventBus.events$.subscribe(listener);

            const promise = fooContentCrud!.get(ctx, '1234', { someOption: 'baz' });

            const getItemStart: GetItemStart = {
              type: 'getItemStart',
              contentId: '1234',
              contentType: FOO_CONTENT_ID,
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
              contentType: FOO_CONTENT_ID,
            };

            expect(listener).toHaveBeenCalledWith(getItemSuccess);

            listener.mockReset();

            const errorMessage = 'Ohhh no!';
            const reject = jest.fn();
            await fooContentCrud!.get(ctx, '1234', { errorToThrow: errorMessage }).catch(reject);

            const getItemError: GetItemError = {
              type: 'getItemError',
              contentId: '1234',
              contentType: FOO_CONTENT_ID,
              error: errorMessage,
              options: { errorToThrow: errorMessage },
            };

            expect(listener).toHaveBeenLastCalledWith(getItemError);

            expect(reject).toHaveBeenCalledWith(new Error(errorMessage));

            sub.unsubscribe();

            cleanUp();
          });

          test('create()', async () => {
            const { fooContentCrud, ctx, FOO_CONTENT_ID, eventBus, cleanUp } = setup({
              registerFooType: true,
            });

            const data = { title: 'Hello' };

            const listener = jest.fn();
            const sub = eventBus.events$.subscribe(listener);

            const promise = fooContentCrud!.create<Omit<MockContent, 'id'>, { id: string }>(
              ctx,
              data,
              {
                id: '1234',
              }
            );

            const createItemStart: CreateItemStart = {
              type: 'createItemStart',
              contentType: FOO_CONTENT_ID,
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
              contentType: FOO_CONTENT_ID,
              options: { id: '1234' },
            };

            expect(listener).toHaveBeenCalledWith(createItemSuccess);

            listener.mockReset();

            const errorMessage = 'Ohhh no!';
            const reject = jest.fn();
            await fooContentCrud!
              .create<Omit<MockContent, 'id'>, { id: string; errorToThrow: string }>(ctx, data, {
                id: '1234',
                errorToThrow: errorMessage,
              })
              .catch(reject);

            const createItemError: CreateItemError = {
              type: 'createItemError',
              contentType: FOO_CONTENT_ID,
              data,
              error: errorMessage,
              options: { id: '1234', errorToThrow: errorMessage },
            };

            expect(listener).toHaveBeenLastCalledWith(createItemError);

            expect(reject).toHaveBeenCalledWith(new Error(errorMessage));

            sub.unsubscribe();
            cleanUp();
          });

          test('update()', async () => {
            const { fooContentCrud, ctx, eventBus, FOO_CONTENT_ID, cleanUp } = setup({
              registerFooType: true,
            });

            await fooContentCrud!.create<Omit<MockContent, 'id'>, { id: string }>(
              ctx,
              { title: 'Hello' },
              {
                id: '1234',
              }
            );

            const listener = jest.fn();
            const sub = eventBus.events$.subscribe(listener);

            const data = { title: 'Updated' };

            const promise = await fooContentCrud!.update(ctx, '1234', data, { someOptions: 'baz' });

            const updateItemStart: UpdateItemStart = {
              type: 'updateItemStart',
              contentId: '1234',
              contentType: FOO_CONTENT_ID,
              data,
              options: { someOptions: 'baz' },
            };

            expect(listener).toHaveBeenCalledWith(updateItemStart);

            await promise;

            const updateItemSuccess: UpdateItemSuccess = {
              type: 'updateItemSuccess',
              contentId: '1234',
              contentType: FOO_CONTENT_ID,
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
            await fooContentCrud!
              .update(ctx, '1234', data, {
                errorToThrow: errorMessage,
              })
              .catch(reject);

            const updateItemError: UpdateItemError = {
              type: 'updateItemError',
              contentType: FOO_CONTENT_ID,
              contentId: '1234',
              data,
              error: errorMessage,
              options: { errorToThrow: errorMessage },
            };

            expect(listener).toHaveBeenLastCalledWith(updateItemError);

            expect(reject).toHaveBeenCalledWith(new Error(errorMessage));

            sub.unsubscribe();
            cleanUp();
          });

          test('delete()', async () => {
            const { fooContentCrud, ctx, FOO_CONTENT_ID, eventBus, cleanUp } = setup({
              registerFooType: true,
            });

            await fooContentCrud!.create<Omit<MockContent, 'id'>, { id: string }>(
              ctx,
              { title: 'Hello' },
              {
                id: '1234',
              }
            );

            const listener = jest.fn();
            const sub = eventBus.events$.subscribe(listener);

            const promise = await fooContentCrud!.delete(ctx, '1234', { someOptions: 'baz' });

            const deleteItemStart: DeleteItemStart = {
              type: 'deleteItemStart',
              contentId: '1234',
              contentType: FOO_CONTENT_ID,
              options: { someOptions: 'baz' },
            };

            expect(listener).toHaveBeenCalledWith(deleteItemStart);

            await promise;

            const deleteItemSuccess: DeleteItemSuccess = {
              type: 'deleteItemSuccess',
              contentId: '1234',
              contentType: FOO_CONTENT_ID,
              options: { someOptions: 'baz' },
            };

            expect(listener).toHaveBeenCalledWith(deleteItemSuccess);

            listener.mockReset();

            const errorMessage = 'Ohhh no!';
            const reject = jest.fn();
            await fooContentCrud!
              .delete(ctx, '1234', {
                errorToThrow: errorMessage,
              })
              .catch(reject);

            const deleteItemError: DeleteItemError = {
              type: 'deleteItemError',
              contentType: FOO_CONTENT_ID,
              contentId: '1234',
              error: errorMessage,
              options: { errorToThrow: errorMessage },
            };

            expect(listener).toHaveBeenLastCalledWith(deleteItemError);

            expect(reject).toHaveBeenCalledWith(new Error(errorMessage));

            sub.unsubscribe();
            cleanUp();
          });
        });
      });
    });
  });
});
