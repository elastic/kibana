/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { VersionedRouteResponseValidation } from '@kbn/core-http-server';
import {
  isCustomValidation,
  unwrapVersionedResponseBodyValidation,
  prepareVersionedRouteValidation,
} from './util';

test.each([
  [() => schema.object({}), false],
  [{ custom: () => ({ value: 1 }) }, true],
])('isCustomValidation correctly detects custom validation %#', (input, result) => {
  expect(isCustomValidation(input)).toBe(result);
});

describe('prepareVersionedRouteValidation', () => {
  it('wraps only expected values', () => {
    const validate = {
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
      },
    };

    const prepared = prepareVersionedRouteValidation({
      version: '1',
      validate,
    });

    expect(prepared).toEqual({
      version: '1',
      validate: {
        request: {},
        response: {
          200: { body: expect.any(Function) },
          404: { body: expect.any(Function) },
          500: { description: 'just a description', body: undefined },
        },
      },
    });
  });

  describe('validates security config', () => {
    it('throws error if requiredPrivileges are not provided with enabled authz', () => {
      expect(() =>
        prepareVersionedRouteValidation({
          version: '1',
          validate: false,
          security: {
            authz: {
              requiredPrivileges: [],
            },
          },
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[authz.requiredPrivileges]: array size is [0], but cannot be smaller than [1]"`
      );
    });

    it('throws error if reason is not provided with disabled authz', () => {
      expect(() =>
        prepareVersionedRouteValidation({
          version: '1',
          validate: false,
          security: {
            // @ts-expect-error
            authz: {
              enabled: false,
            },
          },
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[authz.reason]: expected value of type [string] but got [undefined]"`
      );
    });

    it('passes through valid security configuration with enabled authz', () => {
      expect(
        prepareVersionedRouteValidation({
          version: '1',
          validate: false,
          security: {
            authz: {
              requiredPrivileges: ['privilege-1', { anyRequired: ['privilege-2', 'privilege-3'] }],
            },
          },
        })
      ).toMatchInlineSnapshot(`
        Object {
          "security": Object {
            "authz": Object {
              "requiredPrivileges": Array [
                "privilege-1",
                Object {
                  "anyRequired": Array [
                    "privilege-2",
                    "privilege-3",
                  ],
                },
              ],
            },
          },
          "validate": false,
          "version": "1",
        }
      `);
    });

    it('passes through valid security configuration with disabled authz', () => {
      expect(
        prepareVersionedRouteValidation({
          version: '1',
          validate: false,
          security: {
            authz: {
              enabled: false,
              reason: 'Authorization is disabled',
            },
          },
        })
      ).toMatchInlineSnapshot(`
        Object {
          "security": Object {
            "authz": Object {
              "enabled": false,
              "reason": "Authorization is disabled",
            },
          },
          "validate": false,
          "version": "1",
        }
      `);
    });
  });
});

test('unwrapVersionedResponseBodyValidation', () => {
  const mySchema = schema.object({});
  const custom = () => ({ value: 'ok' });
  const validation: VersionedRouteResponseValidation = {
    200: {
      body: () => mySchema,
    },
    404: {
      body: { custom },
    },
  };

  expect(unwrapVersionedResponseBodyValidation(validation[200].body!)).toBe(mySchema);
  expect(unwrapVersionedResponseBodyValidation(validation[404].body!)).toBe(custom);
});
