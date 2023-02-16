/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { validate } from '../../utils';
import { get } from './get';

const inputSchema = get.schemas?.in;
const outputSchema = get.schemas?.out;

if (!inputSchema) {
  throw new Error(`Input schema missing for [get] procedure.`);
}

if (!outputSchema) {
  throw new Error(`Output schema missing for [get] procedure.`);
}

describe('RPC -> get()', () => {
  describe('Input/Output validation', () => {
    test('should validate that a contentTypeId and an id is passed', () => {
      [
        { input: { contentTypeId: 'foo', id: '123' } },
        {
          input: { id: '777' }, // contentTypeId missing
          expectedError: '[contentTypeId]: expected value of type [string] but got [undefined]',
        },
        {
          input: { contentTypeId: 'foo', id: '123', unknown: 'foo' },
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

    test('should allow an options "object" to be passed', () => {
      let error = validate(
        {
          contentTypeId: 'foo',
          id: '123',
          options: { any: 'object' },
        },
        inputSchema
      );

      expect(error).toBe(null);

      error = validate(
        {
          contentTypeId: 'foo',
          id: '123',
          options: 123, // Not an object
        },
        inputSchema
      );

      expect(error?.message).toBe(
        '[options]: expected a plain object value, but found [number] instead.'
      );
    });

    test('should validate that the response is an object', () => {
      let error = validate(
        {
          any: 'object',
        },
        outputSchema
      );

      expect(error).toBe(null);

      error = validate(123, outputSchema);

      expect(error?.message).toBe('expected a plain object value, but found [number] instead.');
    });
  });
});
