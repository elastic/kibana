/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { RouteValidator } from '@kbn/core-http-server';
import {
  injectResponseHeaders,
  prepareResponseValidation,
  prepareRouteConfigValidation,
} from './util';
import { kibanaResponseFactory } from './response';

describe('prepareRouteConfigValidation', () => {
  it('preserves static getter options from DI route classes', () => {
    class DiRoute {
      public static method = 'post' as const;
      public static path = '/api/example';
      public static security = {
        authz: { enabled: false as const, reason: 'test' },
      };
      public static get options() {
        return { access: 'public' as const, tags: ['oas-tag:test'] };
      }
      public static get validate() {
        return {
          request: { body: schema.object({ name: schema.string() }) },
          response: {
            200: { body: () => schema.object({ ok: schema.boolean() }) },
          },
        };
      }
    }

    // Object spread alone drops non-enumerable static getters — the bug this guards against.
    expect(Object.prototype.hasOwnProperty.call({ ...DiRoute }, 'options')).toBe(false);

    const prepared = prepareRouteConfigValidation(DiRoute);

    expect(prepared.options).toEqual({ access: 'public', tags: ['oas-tag:test'] });
    expect(prepared.path).toBe('/api/example');
    expect(prepared.validate).toEqual(
      expect.objectContaining({
        request: expect.any(Object),
        response: expect.any(Object),
      })
    );
  });
});

describe('prepareResponseValidation', () => {
  it('wraps only expected values in "once"', () => {
    const validation: RouteValidator<unknown, unknown, unknown> = {
      request: {},
      response: {
        200: {
          body: jest.fn(() => schema.string()),
        },
        404: {
          body: jest.fn(() => schema.string()),
        },
        500: {
          description: 'just a description',
          body: undefined,
        },
        unsafe: {
          body: true,
        },
      },
    };

    const prepared = prepareResponseValidation(validation.response!);

    expect(prepared).toEqual({
      200: { body: expect.any(Function) },
      404: { body: expect.any(Function) },
      500: { description: 'just a description', body: undefined },
      unsafe: { body: true },
    });

    [1, 2, 3].forEach(() => prepared[200].body!());
    [1, 2, 3].forEach(() => prepared[404].body!());

    expect(validation.response![200].body).toHaveBeenCalledTimes(1);
    expect(validation.response![404].body).toHaveBeenCalledTimes(1);
    expect(validation.response![500].body).toBeUndefined();
  });
});

describe('injectResponseHeaders', () => {
  it('injects an empty value as expected', () => {
    const result = injectResponseHeaders({}, kibanaResponseFactory.ok());
    expect(result.options.headers).toEqual({});
  });
  it('merges values as expected', () => {
    const result = injectResponseHeaders(
      { foo: 'false', baz: 'true' },
      kibanaResponseFactory.ok({ headers: { foo: 'true', bar: 'false' } })
    );
    expect(result.options.headers).toEqual({ foo: 'false', bar: 'false', baz: 'true' });
  });
});
