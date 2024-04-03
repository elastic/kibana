/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';

import { until } from '../event_stream/tests/util';
import { setupEventStreamService } from '../event_stream/tests/setup_event_stream_service';
import { ContentClient } from '../content_client/content_client';
import { Core } from './core';
import { createMemoryStorage, createMockedStorage } from './mocks';
import { ContentRegistry } from './registry';
import type { ContentCrud } from './crud';
import type {
  GetItemStart,
  GetItemSuccess,
  GetItemError,
  BulkGetItemStart,
  BulkGetItemSuccess,
  BulkGetItemError,
  CreateItemStart,
  CreateItemSuccess,
  CreateItemError,
  UpdateItemStart,
  UpdateItemSuccess,
  UpdateItemError,
  DeleteItemStart,
  DeleteItemSuccess,
  DeleteItemError,
  SearchItemStart,
  SearchItemSuccess,
  SearchItemError,
} from './event_types';
import { ContentStorage, ContentTypeDefinition, StorageContext } from './types';

const spyMsearch = jest.fn();
const getmSearchSpy = () => spyMsearch;

jest.mock('./msearch', () => {
  const original = jest.requireActual('./msearch');
  class MSearchService {
    search(...args: any[]) {
      getmSearchSpy()(...args);
    }
  }
  return {
    ...original,
    MSearchService,
  };
});

const logger = loggingSystemMock.createLogger();

const FOO_CONTENT_ID = 'foo';

const setup = ({
  registerFooType = false,
  storage = createMemoryStorage(),
  latestVersion = 2,
}: { registerFooType?: boolean; storage?: ContentStorage; latestVersion?: number } = {}) => {
  const ctx: StorageContext = {
    requestHandlerContext: {} as any,
    version: {
      latest: latestVersion,
      request: 1,
    },
    utils: {
      getTransforms: jest.fn(),
    },
  };

  const eventStream = setupEventStreamService().service;
  const core = new Core({
    logger,
    eventStream,
  });
  const coreSetup = core.setup();

  const contentDefinition: ContentTypeDefinition = {
    id: FOO_CONTENT_ID,
    storage,
    version: {
      latest: latestVersion,
    },
  };
  const cleanUp = () => {
    coreSetup.api.eventBus.stop();
  };

  let fooContentCrud: ContentCrud | undefined;

  if (registerFooType) {
    coreSetup.api.register(contentDefinition);
    fooContentCrud = coreSetup.api.crud(FOO_CONTENT_ID);
  }

  return {
    core,
    coreSetup,
    contentDefinition,
    ctx,
    fooContentCrud,
    cleanUp,
    eventBus: coreSetup.api.eventBus,
    eventStream,
  };
};

describe('Content Core', () => {
  describe('setup()', () => {
    test('should return the registry and the public api', () => {
      const { coreSetup, cleanUp } = setup();

      expect(coreSetup.contentRegistry).toBeInstanceOf(ContentRegistry);
      expect(Object.keys(coreSetup.api).sort()).toEqual([
        'contentClient',
        'crud',
        'eventBus',
        'register',
      ]);

      cleanUp();
    });

    describe('api', () => {
      describe('register()', () => {
        test('should expose the register handler from the registry instance', () => {
          const { coreSetup, cleanUp, contentDefinition } = setup();

          const {
            contentRegistry,
            api: { register },
          } = coreSetup;

          expect(contentRegistry.isContentRegistered(FOO_CONTENT_ID)).toBe(false);

          register(contentDefinition);

          // Make sure the "register" exposed by the api is indeed registring
          // the content into our "contentRegistry" instance
          expect(contentRegistry.isContentRegistered(FOO_CONTENT_ID)).toBe(true);
          expect(contentRegistry.getDefinition(FOO_CONTENT_ID)).toEqual(contentDefinition);

          cleanUp();
        });

        test('should convert the latest version to number if string is passed', () => {
          const { coreSetup, cleanUp, contentDefinition } = setup();

          const {
            contentRegistry,
            api: { register },
          } = coreSetup;

          register({ ...contentDefinition, version: { latest: '123' } } as any);

          expect(contentRegistry.getContentType(contentDefinition.id).version).toEqual({
            latest: 123,
          });

          cleanUp();
        });

        test('should throw if latest version passed is not valid', () => {
          const { coreSetup, cleanUp, contentDefinition } = setup();

          const {
            contentRegistry,
            api: { register },
          } = coreSetup;

          expect(contentRegistry.isContentRegistered(FOO_CONTENT_ID)).toBe(false);

          expect(() => {
            register({ ...contentDefinition, version: undefined } as any);
          }).toThrowError('Invalid version [undefined]. Must be an integer.');

          expect(() => {
            register({ ...contentDefinition, version: { latest: 0 } });
          }).toThrowError('Version must be >= 1');

          cleanUp();
        });

        test('should return a contentClient when registering', async () => {
          const storage = createMockedStorage();
          const latestVersion = 11;

          const { coreSetup, cleanUp, contentDefinition } = setup({ latestVersion, storage });

          const { contentClient } = coreSetup.api.register(contentDefinition);

          {
            const client = contentClient.getForRequest({
              requestHandlerContext: {} as any,
              request: {} as any,
              version: 2,
            });

            await client.get('1234');
            expect(storage.get).toHaveBeenCalledTimes(1);

            const [storageContext] = storage.get.mock.calls[0];
            expect(storageContext.version).toEqual({
              latest: latestVersion,
              request: 2, // version passed in the request should be used
            });
          }

          storage.get.mockReset();

          {
            // If no request version is passed, the latest version should be used
            const client = contentClient.getForRequest({
              requestHandlerContext: {} as any,
              request: {} as any,
            });

            await client.get('1234');

            const [storageContext] = storage.get.mock.calls[0];
            expect(storageContext.version).toEqual({
              latest: latestVersion,
              request: latestVersion, // latest version should be used
            });
          }

          cleanUp();
        });
      });

      describe('crud()', () => {
        test('get()', async () => {
          const { fooContentCrud, ctx, cleanUp } = setup({ registerFooType: true });

          const res = await fooContentCrud!.get(ctx, '1');
          expect(res.result.item).toBeUndefined();

          cleanUp();
        });

        test('get() - options are forwared to storage layer', async () => {
          const { fooContentCrud, ctx, cleanUp } = setup({ registerFooType: true });

          const res = await fooContentCrud!.get(ctx, '1', { forwardInResponse: { foo: 'bar' } });
          expect(res).toEqual({
            contentTypeId: FOO_CONTENT_ID,
            result: {
              item: {
                // Options forwared in response
                options: { foo: 'bar' },
              },
            },
          });

          cleanUp();
        });

        test('bulkGet()', async () => {
          const { fooContentCrud, ctx, cleanUp } = setup({ registerFooType: true });

          const res = await fooContentCrud!.bulkGet(ctx, ['1', '2']);
          expect(res.result).toEqual({
            hits: [{ item: undefined }, { item: undefined }],
          });

          cleanUp();
        });

        test('bulkGet() - options are forwared to storage layer', async () => {
          const { fooContentCrud, ctx, cleanUp } = setup({ registerFooType: true });

          const res = await fooContentCrud!.bulkGet(ctx, ['1', '2'], {
            forwardInResponse: { foo: 'bar' },
          });

          expect(res).toEqual({
            contentTypeId: FOO_CONTENT_ID,
            result: {
              hits: [
                {
                  item: {
                    options: { foo: 'bar' }, // Options forwared in response
                  },
                },
                {
                  item: {
                    options: { foo: 'bar' }, // Options forwared in response
                  },
                },
              ],
            },
          });

          cleanUp();
        });

        test('create()', async () => {
          const { fooContentCrud, ctx, cleanUp } = setup({ registerFooType: true });

          const res = await fooContentCrud!.get(ctx, '1234');
          expect(res.result.item).toBeUndefined();
          await fooContentCrud!.create(
            ctx,
            { title: 'Hello' },
            { id: '1234' } // We send this "id" option to specify the id of the content created
          );
          expect(fooContentCrud!.get(ctx, '1234')).resolves.toEqual({
            contentTypeId: FOO_CONTENT_ID,
            result: {
              item: {
                id: '1234',
                title: 'Hello',
              },
            },
          });

          cleanUp();
        });

        test('update()', async () => {
          const { fooContentCrud, ctx, cleanUp } = setup({ registerFooType: true });

          await fooContentCrud!.create(ctx, { title: 'Hello' }, { id: '1234' });
          await fooContentCrud!.update(ctx, '1234', { title: 'changed' });
          expect(fooContentCrud!.get(ctx, '1234')).resolves.toEqual({
            contentTypeId: FOO_CONTENT_ID,
            result: {
              item: {
                id: '1234',
                title: 'changed',
              },
            },
          });

          cleanUp();
        });

        test('update() - options are forwared to storage layer', async () => {
          const { fooContentCrud, ctx, cleanUp } = setup({ registerFooType: true });

          await fooContentCrud!.create(ctx, { title: 'Hello' }, { id: '1234' });
          const res = await fooContentCrud!.update(
            ctx,
            '1234',
            { title: 'changed' },
            { forwardInResponse: { foo: 'bar' } }
          );

          expect(res).toEqual({
            contentTypeId: FOO_CONTENT_ID,
            result: {
              item: {
                id: '1234',
                title: 'changed',
                // Options forwared in response
                options: { foo: 'bar' },
              },
            },
          });

          expect(fooContentCrud!.get(ctx, '1234')).resolves.toEqual({
            contentTypeId: FOO_CONTENT_ID,
            result: {
              item: {
                id: '1234',
                title: 'changed',
              },
            },
          });

          cleanUp();
        });

        test('delete()', async () => {
          const { fooContentCrud, ctx, cleanUp } = setup({ registerFooType: true });

          await fooContentCrud!.create(ctx, { title: 'Hello' }, { id: '1234' });
          expect(fooContentCrud!.get(ctx, '1234')).resolves.toEqual({
            contentTypeId: FOO_CONTENT_ID,
            result: {
              item: expect.any(Object),
            },
          });
          await fooContentCrud!.delete(ctx, '1234');
          expect(fooContentCrud!.get(ctx, '1234')).resolves.toEqual({
            contentTypeId: FOO_CONTENT_ID,
            result: {
              item: undefined,
            },
          });

          cleanUp();
        });

        test('delete() - options are forwared to storage layer', async () => {
          const { fooContentCrud, ctx, cleanUp } = setup({ registerFooType: true });

          await fooContentCrud!.create(ctx, { title: 'Hello' }, { id: '1234' });
          const res = await fooContentCrud!.delete(ctx, '1234', {
            forwardInResponse: { foo: 'bar' },
          });
          expect(res).toMatchObject({ result: { success: true, options: { foo: 'bar' } } });

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
            contentTypeId: FOO_CONTENT_ID,
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
            contentTypeId: FOO_CONTENT_ID,
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
            eventBus.on('getItemStart', FOO_CONTENT_ID, jest.fn());
          }).toThrow('Invalid content type [foo].');

          cleanUp();
        });

        test('should allow to subscribe to a single event for a single content type', async () => {
          const { coreSetup, ctx, contentDefinition, cleanUp } = setup();

          const {
            api: { eventBus, register, crud },
          } = coreSetup;

          register(contentDefinition);

          await crud(FOO_CONTENT_ID).create(ctx, { title: 'Hello' }, { id: '1234' });

          const listener = jest.fn();

          // Listen to "getItemStart" events *only* on the "foo" content type
          eventBus.on('getItemStart', FOO_CONTENT_ID, listener);

          let event: GetItemStart = {
            type: 'getItemStart',
            contentId: '123',
            contentTypeId: 'other', // other type should not call listener
          };
          eventBus.emit(event);

          expect(listener).not.toHaveBeenCalledWith(event);

          event = {
            type: 'getItemStart',
            contentId: '123',
            contentTypeId: FOO_CONTENT_ID,
          };
          eventBus.emit(event);

          expect(listener).toHaveBeenCalledWith(event);

          cleanUp();
        });

        // Skipping those tests for now. I will re-enable and fix them when doing
        // https://github.com/elastic/kibana/issues/153258
        describe.skip('crud operations should emit start|success|error events', () => {
          test('get()', async () => {
            const { fooContentCrud, eventBus, ctx, cleanUp } = setup({
              registerFooType: true,
            });

            const data = { title: 'Hello' };

            await fooContentCrud!.create(ctx, data, {
              id: '1234',
            });

            const listener = jest.fn();
            const sub = eventBus.events$.subscribe(listener);

            const promise = fooContentCrud!.get(ctx, '1234', { someOption: 'baz' });

            const getItemStart: GetItemStart = {
              type: 'getItemStart',
              contentId: '1234',
              contentTypeId: FOO_CONTENT_ID,
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
              contentTypeId: FOO_CONTENT_ID,
              options: { someOption: 'baz' },
            };

            expect(listener).toHaveBeenCalledWith(getItemSuccess);

            listener.mockReset();

            const errorMessage = 'Ohhh no!';
            const reject = jest.fn();
            await fooContentCrud!.get(ctx, '1234', { errorToThrow: errorMessage }).catch(reject);

            const getItemError: GetItemError = {
              type: 'getItemError',
              contentId: '1234',
              contentTypeId: FOO_CONTENT_ID,
              error: errorMessage,
              options: { errorToThrow: errorMessage },
            };

            expect(listener).toHaveBeenLastCalledWith(getItemError);

            expect(reject).toHaveBeenCalledWith(new Error(errorMessage));

            sub.unsubscribe();

            cleanUp();
          });

          test('bulkGet()', async () => {
            const { fooContentCrud, eventBus, ctx, cleanUp } = setup({
              registerFooType: true,
            });

            const data = { title: 'Hello' };

            await fooContentCrud!.create(ctx, data, {
              id: '1234',
            });
            await fooContentCrud!.create(ctx, data, {
              id: '5678',
            });

            const listener = jest.fn();
            const sub = eventBus.events$.subscribe(listener);

            const promise = fooContentCrud!.bulkGet(ctx, ['1234', '5678'], { someOption: 'baz' });

            const bulkGetItemStart: BulkGetItemStart = {
              type: 'bulkGetItemStart',
              ids: ['1234', '5678'],
              contentTypeId: FOO_CONTENT_ID,
              options: { someOption: 'baz' },
            };

            expect(listener).toHaveBeenCalledWith(bulkGetItemStart);

            await promise;

            const bulkGetItemSuccess: BulkGetItemSuccess = {
              type: 'bulkGetItemSuccess',
              ids: ['1234', '5678'],
              data: [
                {
                  id: '1234',
                  ...data,
                },
                {
                  id: '5678',
                  ...data,
                },
              ],
              contentTypeId: FOO_CONTENT_ID,
              options: { someOption: 'baz' },
            };

            expect(listener).toHaveBeenCalledWith(bulkGetItemSuccess);

            listener.mockReset();

            const errorMessage = 'Ohhh no!';
            const reject = jest.fn();
            await fooContentCrud!
              .bulkGet(ctx, ['1234', '5678'], { errorToThrow: errorMessage })
              .catch(reject);

            const bulkGetItemError: BulkGetItemError = {
              type: 'bulkGetItemError',
              ids: ['1234', '5678'],
              contentTypeId: FOO_CONTENT_ID,
              error: errorMessage,
              options: { errorToThrow: errorMessage },
            };

            expect(listener).toHaveBeenLastCalledWith(bulkGetItemError);

            expect(reject).toHaveBeenCalledWith(new Error(errorMessage));

            sub.unsubscribe();

            cleanUp();
          });

          test('create()', async () => {
            const { fooContentCrud, ctx, eventBus, cleanUp } = setup({
              registerFooType: true,
            });

            const data = { title: 'Hello' };

            const listener = jest.fn();
            const sub = eventBus.events$.subscribe(listener);

            const promise = fooContentCrud!.create(ctx, data, {
              id: '1234',
            });

            const createItemStart: CreateItemStart = {
              type: 'createItemStart',
              contentTypeId: FOO_CONTENT_ID,
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
              contentTypeId: FOO_CONTENT_ID,
              options: { id: '1234' },
            };

            expect(listener).toHaveBeenCalledWith(createItemSuccess);

            listener.mockReset();

            const errorMessage = 'Ohhh no!';
            const reject = jest.fn();
            await fooContentCrud!
              .create(ctx, data, {
                id: '1234',
                errorToThrow: errorMessage,
              })
              .catch(reject);

            const createItemError: CreateItemError = {
              type: 'createItemError',
              contentTypeId: FOO_CONTENT_ID,
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
            const { fooContentCrud, ctx, eventBus, cleanUp } = setup({
              registerFooType: true,
            });

            await fooContentCrud!.create(
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
              contentTypeId: FOO_CONTENT_ID,
              data,
              options: { someOptions: 'baz' },
            };

            expect(listener).toHaveBeenCalledWith(updateItemStart);

            await promise;

            const updateItemSuccess: UpdateItemSuccess = {
              type: 'updateItemSuccess',
              contentId: '1234',
              contentTypeId: FOO_CONTENT_ID,
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
              contentTypeId: FOO_CONTENT_ID,
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
            const { fooContentCrud, ctx, eventBus, cleanUp } = setup({
              registerFooType: true,
            });

            await fooContentCrud!.create(
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
              contentTypeId: FOO_CONTENT_ID,
              options: { someOptions: 'baz' },
            };

            expect(listener).toHaveBeenCalledWith(deleteItemStart);

            await promise;

            const deleteItemSuccess: DeleteItemSuccess = {
              type: 'deleteItemSuccess',
              contentId: '1234',
              contentTypeId: FOO_CONTENT_ID,
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
              contentTypeId: FOO_CONTENT_ID,
              contentId: '1234',
              error: errorMessage,
              options: { errorToThrow: errorMessage },
            };

            expect(listener).toHaveBeenLastCalledWith(deleteItemError);

            expect(reject).toHaveBeenCalledWith(new Error(errorMessage));

            sub.unsubscribe();
            cleanUp();
          });

          test('search()', async () => {
            const { fooContentCrud, ctx, eventBus, cleanUp } = setup({
              registerFooType: true,
            });

            const myContent = { title: 'Hello' };

            await fooContentCrud!.create(ctx, myContent, {
              id: '1234',
            });

            const listener = jest.fn();
            const sub = eventBus.events$.subscribe(listener);

            const query = { text: 'Hell' };

            const promise = await fooContentCrud!.search(ctx, query, { someOptions: 'baz' });

            const searchItemStart: SearchItemStart = {
              type: 'searchItemStart',
              query,
              contentTypeId: FOO_CONTENT_ID,
              options: { someOptions: 'baz' },
            };

            expect(listener).toHaveBeenCalledWith(searchItemStart);

            await promise;

            const searchItemSuccess: SearchItemSuccess = {
              type: 'searchItemSuccess',
              query,
              data: [{ id: '1234', ...myContent }],
              contentTypeId: FOO_CONTENT_ID,
              options: { someOptions: 'baz' },
            };

            expect(listener).toHaveBeenCalledWith(searchItemSuccess);

            listener.mockReset();

            const errorMessage = 'Ohhh no!';
            const reject = jest.fn();
            await fooContentCrud!
              .search(ctx, query, {
                errorToThrow: errorMessage,
              })
              .catch(reject);

            const searchItemError: SearchItemError = {
              type: 'searchItemError',
              contentTypeId: FOO_CONTENT_ID,
              query,
              error: errorMessage,
              options: { errorToThrow: errorMessage },
            };

            expect(listener).toHaveBeenLastCalledWith(searchItemError);

            expect(reject).toHaveBeenCalledWith(new Error(errorMessage));

            sub.unsubscribe();
            cleanUp();
          });
        });
      });

      describe('contentClient', () => {
        describe('single content type', () => {
          test('should return a ClientContent instance for a specific request', () => {
            const { coreSetup, cleanUp } = setup({ registerFooType: true });

            const {
              api: { contentClient },
            } = coreSetup;

            const client = contentClient
              .getForRequest({
                requestHandlerContext: {} as any,
                request: {} as any,
              })
              .for(FOO_CONTENT_ID);

            expect(client).toBeInstanceOf(ContentClient);

            cleanUp();
          });

          test('should automatically set the content version to the latest version if not provided', async () => {
            const storage = createMockedStorage();
            const latestVersion = 7;

            const { coreSetup, cleanUp } = setup({
              registerFooType: true,
              latestVersion,
              storage,
            });

            const requestHandlerContext = {} as any;
            const client = coreSetup.api.contentClient
              .getForRequest({
                requestHandlerContext,
                request: {} as any,
              })
              .for(FOO_CONTENT_ID);

            const options = { foo: 'bar' };
            await client.get('1234', options);

            const storageContext = {
              requestHandlerContext,
              utils: { getTransforms: expect.any(Function) },
              version: {
                latest: latestVersion,
                request: latestVersion, // Request version should be set to the latest version
              },
            };

            expect(storage.get).toHaveBeenCalledWith(storageContext, '1234', options);

            cleanUp();
          });

          test('should pass the provided content version', async () => {
            const storage = createMockedStorage();
            const latestVersion = 7;
            const requestVersion = 2;

            const { coreSetup, cleanUp } = setup({
              registerFooType: true,
              latestVersion,
              storage,
            });

            const requestHandlerContext = {} as any;

            const client = coreSetup.api.contentClient
              .getForRequest({
                requestHandlerContext,
                request: {} as any,
              })
              .for(FOO_CONTENT_ID, requestVersion);

            await client.get('1234');

            const storageContext = {
              requestHandlerContext,
              utils: { getTransforms: expect.any(Function) },
              version: {
                latest: latestVersion,
                request: requestVersion, // The requested version should be used
              },
            };

            expect(storage.get).toHaveBeenCalledWith(storageContext, '1234', undefined);

            cleanUp();
          });

          test('should throw if the contentTypeId is not registered', () => {
            const { coreSetup, cleanUp } = setup();

            const {
              api: { contentClient },
            } = coreSetup;

            expect(() => {
              contentClient
                .getForRequest({
                  requestHandlerContext: {} as any,
                  request: {} as any,
                })
                .for(FOO_CONTENT_ID);
            }).toThrowError('Content [foo] is not registered.');

            cleanUp();
          });
        });

        describe('multiple content types', () => {
          const storage = createMockedStorage();

          beforeEach(() => {
            spyMsearch.mockReset();
          });

          test('should automatically set the content version to the latest version if not provided', async () => {
            const { coreSetup, cleanUp } = setup();

            coreSetup.api.register({
              id: 'foo',
              storage,
              version: {
                latest: 9, // Needs to be automatically passed to the mSearch service
              },
            });

            coreSetup.api.register({
              id: 'bar',
              storage,
              version: {
                latest: 11, // Needs to be automatically passed to the mSearch service
              },
            });

            const client = coreSetup.api.contentClient.getForRequest({
              requestHandlerContext: {} as any,
              request: {} as any,
            });

            await client.msearch({
              // We don't pass the version here
              contentTypes: [{ contentTypeId: 'foo' }, { contentTypeId: 'bar' }],
              query: { text: 'Hello' },
            });

            const [contentTypes] = spyMsearch.mock.calls[0];
            expect(contentTypes[0].contentTypeId).toBe('foo');
            expect(contentTypes[0].ctx.version).toEqual({ latest: 9, request: 9 });

            expect(contentTypes[1].contentTypeId).toBe('bar');
            expect(contentTypes[1].ctx.version).toEqual({ latest: 11, request: 11 });

            cleanUp();
          });

          test('should use the request version if provided', async () => {
            const { coreSetup, cleanUp } = setup();

            coreSetup.api.register({
              id: 'foo',
              storage,
              version: {
                latest: 9, // Needs to be automatically passed to the mSearch service
              },
            });

            coreSetup.api.register({
              id: 'bar',
              storage,
              version: {
                latest: 11, // Needs to be automatically passed to the mSearch service
              },
            });

            const client = coreSetup.api.contentClient.getForRequest({
              requestHandlerContext: {} as any,
              request: {} as any,
            });

            await client.msearch({
              // We don't pass the version here
              contentTypes: [
                { contentTypeId: 'foo', version: 2 },
                { contentTypeId: 'bar', version: 3 },
              ],
              query: { text: 'Hello' },
            });

            const [contentTypes] = spyMsearch.mock.calls[0];
            expect(contentTypes[0].ctx.version).toEqual({ latest: 9, request: 2 });
            expect(contentTypes[1].ctx.version).toEqual({ latest: 11, request: 3 });

            cleanUp();
          });
        });
      });
    });

    describe('eventStream', () => {
      test('stores "delete" events', async () => {
        const { fooContentCrud, ctx, eventStream } = setup({ registerFooType: true });

        await fooContentCrud!.create(ctx, { title: 'Hello' }, { id: '1234' });
        await fooContentCrud!.delete(ctx, '1234');

        const findEvent = async () => {
          const tail = await eventStream.tail();

          for (const event of tail) {
            if (
              event.predicate[0] === 'delete' &&
              event.object &&
              event.object[0] === 'foo' &&
              event.object[1] === '1234'
            ) {
              return event;
            }
          }

          return null;
        };

        await until(async () => !!(await findEvent()), 100);

        const event = await findEvent();

        expect(event).toMatchObject({
          predicate: ['delete'],
          object: ['foo', '1234'],
        });
      });
    });
  });
});
