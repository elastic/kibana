/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EventBus } from './event_bus';
import { ChangeAccessModeService } from './change_access_mode';
import { ContentRegistry } from './registry';
import { createMockedStorage } from './mocks';
import type { StorageContext } from '.';
import { mockRouter } from '@kbn/core-http-router-server-mocks';

const setup = () => {
  const contentRegistry = new ContentRegistry(new EventBus());

  const fooStorage = createMockedStorage();
  fooStorage.changeAccessMode = jest.fn().mockResolvedValue({
    objects: [
      { type: 'foo', id: 'foo-1' },
      { type: 'foo', id: 'foo-2' },
    ],
  });

  contentRegistry.register({
    id: `foo`,
    storage: fooStorage,
    version: {
      latest: 1,
    },
  });

  const barStorage = createMockedStorage();
  barStorage.changeAccessMode = jest.fn().mockResolvedValue({
    objects: [{ type: 'bar', id: 'bar-1' }],
  });

  contentRegistry.register({
    id: `bar`,
    storage: barStorage,
    version: {
      latest: 1,
    },
  });

  const changeAccessModeService = new ChangeAccessModeService({
    contentRegistry,
  });

  return { changeAccessModeService, contentRegistry, fooStorage, barStorage };
};

const mockStorageContext = (ctx: Partial<StorageContext> = {}): StorageContext => {
  return {
    request: mockRouter.createFakeKibanaRequest({}),
    requestHandlerContext: 'mockRequestHandlerContext' as any,
    utils: 'mockUtils' as any,
    version: {
      latest: 1,
      request: 1,
    },
    ...ctx,
  };
};

test('should change access mode for single content type', async () => {
  const { changeAccessModeService, fooStorage } = setup();

  const result = await changeAccessModeService.changeAccessMode(
    [
      { type: 'foo', id: 'foo-1', ctx: mockStorageContext() },
      { type: 'foo', id: 'foo-2', ctx: mockStorageContext() },
    ],
    { accessMode: 'read_only' }
  );

  expect(fooStorage.changeAccessMode).toHaveBeenCalledWith(
    expect.objectContaining({
      requestHandlerContext: 'mockRequestHandlerContext',
      version: { latest: 1, request: 1 },
    }),
    ['foo-1', 'foo-2'],
    { accessMode: 'read_only' }
  );

  expect(result).toEqual({
    objects: [
      { type: 'foo', id: 'foo-1' },
      { type: 'foo', id: 'foo-2' },
    ],
  });
});

test('should change access mode for multiple content types', async () => {
  const { changeAccessModeService, fooStorage, barStorage } = setup();

  const result = await changeAccessModeService.changeAccessMode(
    [
      { type: 'foo', id: 'foo-1', ctx: mockStorageContext() },
      { type: 'bar', id: 'bar-1', ctx: mockStorageContext() },
      { type: 'foo', id: 'foo-2', ctx: mockStorageContext() },
    ],
    { accessMode: 'default' }
  );

  expect(fooStorage.changeAccessMode).toHaveBeenCalledWith(
    expect.objectContaining({
      requestHandlerContext: 'mockRequestHandlerContext',
      version: { latest: 1, request: 1 },
    }),
    ['foo-1', 'foo-2'],
    { accessMode: 'default' }
  );

  expect(barStorage.changeAccessMode).toHaveBeenCalledWith(
    expect.objectContaining({
      requestHandlerContext: 'mockRequestHandlerContext',
      version: { latest: 1, request: 1 },
    }),
    ['bar-1'],
    { accessMode: 'default' }
  );

  expect(result).toEqual({
    objects: [
      { type: 'foo', id: 'foo-1' },
      { type: 'foo', id: 'foo-2' },
      { type: 'bar', id: 'bar-1' },
    ],
  });
});

test('should handle objects with different storage contexts', async () => {
  const { changeAccessModeService, fooStorage } = setup();

  const ctx1 = mockStorageContext({ version: { latest: 1, request: 1 } });
  const ctx2 = mockStorageContext({ version: { latest: 2, request: 2 } });

  // When objects have different contexts, it should batch by type but respect the first context
  const result = await changeAccessModeService.changeAccessMode(
    [
      { type: 'foo', id: 'foo-1', ctx: ctx1 },
      { type: 'foo', id: 'foo-2', ctx: ctx2 },
    ],
    { accessMode: 'read_only' }
  );

  // Should use the first context encountered for the type
  expect(fooStorage.changeAccessMode).toHaveBeenCalledWith(ctx1, ['foo-1', 'foo-2'], {
    accessMode: 'read_only',
  });

  expect(result).toEqual({
    objects: [
      { type: 'foo', id: 'foo-1' },
      { type: 'foo', id: 'foo-2' },
    ],
  });
});

test('should throw error when content type does not support changeAccessMode', async () => {
  const { changeAccessModeService, contentRegistry } = setup();

  // Register a content type without changeAccessMode support
  const unsupportedStorage = createMockedStorage();
  delete unsupportedStorage.changeAccessMode;

  contentRegistry.register({
    id: `unsupported`,
    storage: unsupportedStorage,
    version: {
      latest: 1,
    },
  });

  await expect(
    changeAccessModeService.changeAccessMode(
      [{ type: 'unsupported', id: 'unsupported-1', ctx: mockStorageContext() }],
      { accessMode: 'read_only' }
    )
  ).rejects.toThrow('Saved object type unsupported does not support changeAccessMode');
});

test('should handle storage errors and propagate them', async () => {
  const { changeAccessModeService, fooStorage } = setup();

  const storageError = new Error('Storage error');
  fooStorage.changeAccessMode = jest.fn().mockRejectedValue(storageError);

  await expect(
    changeAccessModeService.changeAccessMode(
      [{ type: 'foo', id: 'foo-1', ctx: mockStorageContext() }],
      { accessMode: 'read_only' }
    )
  ).rejects.toThrow('Storage error');
});

test('should handle empty objects array', async () => {
  const { changeAccessModeService } = setup();

  const result = await changeAccessModeService.changeAccessMode([], { accessMode: 'read_only' });

  expect(result).toEqual({
    objects: [],
  });
});

test('should handle storage returning errors for individual objects', async () => {
  const { changeAccessModeService, fooStorage } = setup();

  fooStorage.changeAccessMode = jest.fn().mockResolvedValue({
    objects: [
      { type: 'foo', id: 'foo-1' },
      {
        type: 'foo',
        id: 'foo-2',
        error: {
          error: 'Not Found',
          message: 'Object not found',
          statusCode: 404,
        },
      },
    ],
  });

  const result = await changeAccessModeService.changeAccessMode(
    [
      { type: 'foo', id: 'foo-1', ctx: mockStorageContext() },
      { type: 'foo', id: 'foo-2', ctx: mockStorageContext() },
    ],
    { accessMode: 'read_only' }
  );

  expect(result).toEqual({
    objects: [
      { type: 'foo', id: 'foo-1' },
      {
        type: 'foo',
        id: 'foo-2',
        error: {
          error: 'Not Found',
          message: 'Object not found',
          statusCode: 404,
        },
      },
    ],
  });
});
