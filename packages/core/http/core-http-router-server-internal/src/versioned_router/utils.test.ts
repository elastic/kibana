/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { get } from 'lodash/fp';
import { pipe } from 'fp-ts/lib/function';
import { schema, isConfigSchema } from '@kbn/config-schema';
import { getResponseValidation } from './utils';

const fooSchema = schema.object({ foo: schema.string() });

describe('getResponseValidation', () => {
  test('returns undefined if validation is not defined', () => {
    expect(getResponseValidation(undefined, 200, undefined)).toBe(undefined);

    // Empty response validation object
    expect(
      getResponseValidation({ response: {}, request: { body: fooSchema } }, 200, undefined)
    ).toBe(undefined);

    // Only 400 defined
    expect(
      getResponseValidation(
        { response: { 400: { body: fooSchema } }, request: { body: fooSchema } },
        200,
        undefined
      )
    ).toBe(undefined);
  });

  test('handles single response validation', () => {
    expect(
      pipe(
        getResponseValidation(
          {
            response: {
              200: {
                body: fooSchema,
              },
              400: {
                body: fooSchema,
              },
            },
          },
          200,
          undefined
        ),
        get('body'),
        isConfigSchema
      )
    ).toBe(true);
  });

  test('handles multiple response validation', () => {
    expect(
      pipe(
        getResponseValidation(
          {
            response: {
              200: [
                {
                  contentType: 'application/json',
                  body: fooSchema,
                },
                {
                  contentType: 'text/plain',
                  body: schema.string(),
                },
              ],
              400: {
                body: fooSchema,
              },
            },
          },
          200,
          'text/plain'
        ),
        get('body'),
        isConfigSchema
      )
    ).toBe(true);

    expect(
      getResponseValidation(
        {
          response: {
            200: [
              {
                contentType: 'application/json',
                body: fooSchema,
              },
              {
                contentType: 'text/plain',
                body: schema.string(),
              },
            ],
            400: {
              body: fooSchema,
            },
          },
        },
        200,
        'unknown'
      )
    ).toBe(undefined);
  });
});
