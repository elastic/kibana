/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';

import type { ChangeAccessModeIn } from '../../../common';
import { validate, disableTransformsCache } from '../../utils';
import { ContentRegistry } from '../../core/registry';
import { createMockedStorage } from '../../core/mocks';
import { EventBus } from '../../core/event_bus';
import { getChangeAccessMode } from './change_access_mode';

disableTransformsCache();
const storageContextGetTransforms = jest.fn();
const spy = () => storageContextGetTransforms;
const mockLoggerFactory = loggingSystemMock.create();
const mockLogger = mockLoggerFactory.get('mock logger');

jest.mock('@kbn/object-versioning', () => {
  const original = jest.requireActual('@kbn/object-versioning');
  return {
    ...original,
    getContentManagementServicesTransforms: (...args: any[]) => {
      spy()(...args);
      return original.getContentManagementServicesTransforms(...args);
    },
  };
});

const { fn, schemas } = getChangeAccessMode(mockLogger);

const inputSchema = schemas?.in;
const outputSchema = schemas?.out;

if (!inputSchema) {
  throw new Error(`Input schema missing for [changeAccessMode] procedure.`);
}

if (!outputSchema) {
  throw new Error(`Output schema missing for [changeAccessMode] procedure.`);
}

describe('RPC -> changeAccessMode()', () => {
  describe('Input/Output validation', () => {
    const validInput: ChangeAccessModeIn = {
      objects: [
        { contentTypeId: 'dashboard', id: 'id-1' },
        { contentTypeId: 'dashboard', id: 'id-2' },
      ],
      options: {
        accessMode: 'read_only',
      },
    };

    test('should validate objects and options', () => {
      [
        { input: validInput },
        { input: { ...validInput, version: 1 } }, // version is optional
        {
          input: { ...validInput, objects: undefined }, // objects missing
          expectedError: '[objects]: expected value of type [array] but got [undefined]',
        },
        {
          input: { ...validInput, objects: [] }, // objects is empty
          expectedError: '[objects]: array size is [0], but cannot be smaller than [1]',
        },
        {
          input: {
            ...validInput,
            objects: [{ contentTypeId: 'dashboard' }], // objects has no id
          },
          expectedError: '[objects.0.id]: expected value of type [string] but got [undefined]',
        },
        {
          input: {
            ...validInput,
            objects: [{ id: 'id-1' }], // objects has no contentTypeId
          },
          expectedError:
            '[objects.0.contentTypeId]: expected value of type [string] but got [undefined]',
        },
        {
          input: { ...validInput, options: undefined }, // options missing
          expectedError:
            '[options.accessMode]: expected at least one defined value but got [undefined]',
        },
        {
          input: {
            ...validInput,
            options: { accessMode: 'invalid' },
          }, // invalid accessMode
          expectedError:
            '[options.accessMode]: types that failed validation:\n- [options.accessMode.0]: expected value to equal [read_only]\n- [options.accessMode.1]: expected value to equal [default]',
        },
        {
          input: { ...validInput, unknown: 'foo' },
          expectedError: '[unknown]: definition for this key is missing',
        },
      ].forEach(({ input, expectedError }) => {
        const error = validate(input, inputSchema);
        if (!expectedError) {
          try {
            expect(error).toBe(null);
          } catch (e) {
            throw new Error(`Expected no error but got [{${error?.message}}].`);
          }
        } else {
          expect(error?.message).toBe(expectedError);
        }
      });
    });

    test('should validate the response format with "objects"', () => {
      let error = validate(
        {
          objects: [
            { type: 'dashboard', id: 'id-1' },
            { type: 'dashboard', id: 'id-2' },
          ],
        },
        outputSchema
      );

      expect(error).toBe(null);

      error = validate(
        {
          objects: [
            {
              type: 'dashboard',
              id: 'id-1',
              error: {
                error: 'Not Found',
                message: 'Object not found',
                statusCode: 404,
              },
            },
          ],
        },
        outputSchema
      );

      expect(error).toBe(null);

      error = validate(123, outputSchema);

      expect(error?.message).toContain(
        'expected a plain object value, but found [number] instead.'
      );
    });
  });

  describe('procedure', () => {
    const setup = () => {
      const contentRegistry = new ContentRegistry(new EventBus());
      const storage = createMockedStorage();
      storage.changeAccessMode = jest.fn().mockResolvedValue({
        objects: [
          { type: 'dashboard', id: 'id-1' },
          { type: 'dashboard', id: 'id-2' },
        ],
      });

      contentRegistry.register({
        id: `dashboard`,
        storage,
        version: {
          latest: 2,
        },
      });

      const requestHandlerContext = 'mockedRequestHandlerContext';
      const ctx: any = {
        contentRegistry,
        requestHandlerContext,
        request: 'mockedRequest',
      };

      return { ctx, storage };
    };

    test('should call storage changeAccessMode and return result', async () => {
      const { ctx, storage } = setup();

      const result = await fn(ctx, {
        objects: [
          { contentTypeId: 'dashboard', id: 'id-1' },
          { contentTypeId: 'dashboard', id: 'id-2' },
        ],
        options: {
          accessMode: 'read_only',
        },
      });

      expect(result).toEqual({
        objects: [
          { type: 'dashboard', id: 'id-1' },
          { type: 'dashboard', id: 'id-2' },
        ],
      });

      expect(storage.changeAccessMode).toHaveBeenCalledWith(
        {
          request: ctx.request,
          requestHandlerContext: ctx.requestHandlerContext,
          version: {
            request: 2, // should use latest when not provided
            latest: 2, // from the registry
          },
          utils: {
            getTransforms: expect.any(Function),
          },
        },
        ['id-1', 'id-2'],
        {
          accessMode: 'read_only',
        }
      );
    });

    test('should use requested version correctly', async () => {
      const { ctx, storage } = setup();

      await fn(ctx, {
        version: 2, // explicitly request latest version
        objects: [{ contentTypeId: 'dashboard', id: 'id-1' }],
        options: {
          accessMode: 'default',
        },
      });

      expect(storage.changeAccessMode).toHaveBeenCalledWith(
        {
          request: ctx.request,
          requestHandlerContext: ctx.requestHandlerContext,
          version: {
            request: 2, // should use requested version
            latest: 2,
          },
          utils: {
            getTransforms: expect.any(Function),
          },
        },
        ['id-1'],
        {
          accessMode: 'default',
        }
      );
    });

    test('should handle multiple content types', async () => {
      const { ctx, storage } = setup();

      // Register another content type
      const visualizationStorage = createMockedStorage();
      visualizationStorage.changeAccessMode = jest.fn().mockResolvedValue({
        objects: [{ type: 'visualization', id: 'viz-1' }],
      });

      ctx.contentRegistry.register({
        id: 'visualization',
        storage: visualizationStorage,
        version: { latest: 1 },
      });

      await fn(ctx, {
        objects: [
          { contentTypeId: 'dashboard', id: 'id-1' },
          { contentTypeId: 'visualization', id: 'viz-1' },
        ],
        options: {
          accessMode: 'read_only',
        },
      });

      // Should call changeAccessMode for each content type
      expect(storage.changeAccessMode).toHaveBeenCalledWith(
        expect.objectContaining({
          version: { request: 2, latest: 2 },
        }),
        ['id-1'],
        { accessMode: 'read_only' }
      );

      expect(visualizationStorage.changeAccessMode).toHaveBeenCalledWith(
        expect.objectContaining({
          version: { request: 1, latest: 1 },
        }),
        ['viz-1'],
        { accessMode: 'read_only' }
      );
    });

    test('should throw error when content type does not support changeAccessMode', async () => {
      const { ctx } = setup();

      // Register a content type without changeAccessMode support
      const unsupportedStorage = createMockedStorage();
      delete unsupportedStorage.changeAccessMode;

      ctx.contentRegistry.register({
        id: 'unsupported',
        storage: unsupportedStorage,
        version: { latest: 1 },
      });

      await expect(
        fn(ctx, {
          objects: [{ contentTypeId: 'unsupported', id: 'unsupported-1' }],
          options: { accessMode: 'read_only' },
        })
      ).rejects.toThrow('changeAccessMode method missing for content type "unsupported".');
    });
  });
});
