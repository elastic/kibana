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
import { GetItemStart } from './event_types';

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
          eventBus.on('getItemStart', listener);

          const event: GetItemStart = {
            type: 'getItemStart',
            contentId: '123',
            contentType: 'foo',
          };
          eventBus.emit(event);

          expect(listener).toHaveBeenCalledWith(event);
        });

        test('should validate that the content type is registered when subscribing to single event with content type', () => {
          const {
            api: { eventBus },
          } = coreSetup;

          expect(eventBus.on('getItemStart', 'foo', jest.fn())).rejects.toThrow(
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

        describe('crud operation should emit start|success|error events', () => {
          // TODO
          test('should work', () => {
            expect(true).toBe(true);
          });
        });
      });
    });
  });
});
