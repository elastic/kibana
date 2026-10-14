/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { loggerMock } from '@kbn/logging-mocks';
import type { CoreContext } from '@kbn/core-base-server-internal';
import { UserStorageService } from './user_storage_service';

jest.mock('./routes', () => ({ registerRoutes: jest.fn() }));

const buildRegister = () => {
  const coreContext = {
    logger: { get: () => loggerMock.create() },
  } as unknown as CoreContext;

  const service = new UserStorageService(coreContext);
  const { register } = service.setup({
    http: {
      createRouter: jest.fn().mockReturnValue({
        get: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
      }),
    },
    savedObjects: { registerType: jest.fn() },
  } as any);

  return register;
};

describe('UserStorageService.register()', () => {
  it('accepts a valid schema with a matching defaultValue', () => {
    const register = buildRegister();
    expect(() =>
      register({ 'test:key': { schema: z.string(), defaultValue: 'hello', scope: 'space' } })
    ).not.toThrow();
  });

  it('throws when the defaultValue does not match the schema', () => {
    const register = buildRegister();
    expect(() =>
      register({ 'test:key': { schema: z.string(), defaultValue: 42 as any, scope: 'space' } })
    ).toThrow(/does not match its schema/);
  });

  it('throws when the same key is registered twice', () => {
    const register = buildRegister();
    register({ 'test:key': { schema: z.string(), defaultValue: 'x', scope: 'space' } });
    expect(() =>
      register({ 'test:key': { schema: z.string(), defaultValue: 'y', scope: 'space' } })
    ).toThrow(/already been registered/);
  });

  it('throws when the schema accepts null (reserved tombstone value)', () => {
    const register = buildRegister();
    expect(() =>
      register({
        'test:key': { schema: z.string().nullable(), defaultValue: null as any, scope: 'space' },
      })
    ).toThrow(/must not accept null/);
  });

  it('throws when a z.null() schema is registered', () => {
    const register = buildRegister();
    expect(() =>
      register({ 'test:key': { schema: z.null(), defaultValue: null as any, scope: 'space' } })
    ).toThrow(/must not accept null/);
  });

  it('accepts a schema that explicitly rejects null (z.string() is non-nullable by default)', () => {
    const register = buildRegister();
    expect(() =>
      register({ 'test:key': { schema: z.string(), defaultValue: '', scope: 'global' } })
    ).not.toThrow();
  });

  it('throws when the schema accepts undefined (reserved for uncached reads)', () => {
    const register = buildRegister();
    expect(() =>
      register({
        'test:key': {
          schema: z.string().optional(),
          defaultValue: 'fallback',
          scope: 'space',
        },
      })
    ).toThrow(/must not accept undefined/);
  });

  it('throws when a z.undefined() schema is registered', () => {
    const register = buildRegister();
    expect(() =>
      register({
        'test:key': { schema: z.undefined(), defaultValue: undefined as any, scope: 'space' },
      })
    ).toThrow(/must not accept undefined/);
  });

  it('throws when a z.unknown() schema is registered (accepts undefined)', () => {
    const register = buildRegister();
    expect(() =>
      register({
        'test:key': { schema: z.unknown(), defaultValue: 0 as any, scope: 'space' },
      })
    ).toThrow(/must not accept undefined/);
  });

  it('accepts a schema that explicitly rejects undefined (z.string() is required by default)', () => {
    const register = buildRegister();
    expect(() =>
      register({ 'test:key': { schema: z.string(), defaultValue: 'x', scope: 'global' } })
    ).not.toThrow();
  });
});
