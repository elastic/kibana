/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';
import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';
import { foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';
import { defaultValue } from '.';

describe('defaultValue', () => {
  describe('Creates a schema that sets a default value if the input value is not specified', () => {
    type TestType = t.TypeOf<typeof TestType>;
    const TestType = t.union([t.string, t.number, t.null, t.undefined], 'TestType');

    const DefaultValue = defaultValue(TestType, 42);

    describe('Name of the schema', () => {
      it('has a default value', () => {
        expect(defaultValue(TestType, 42).name).toEqual('DefaultValue<TestType>');
      });

      it('can be overriden', () => {
        expect(defaultValue(TestType, 42, 'CustomName').name).toEqual('CustomName');
      });
    });

    describe('Validation succeeds', () => {
      describe('when input is a valid value', () => {
        const cases = [
          { input: 'foo' },
          { input: '42' },
          { input: 42 },
          // including all "falsey" values which are not null or undefined
          { input: '' },
          { input: 0 },
        ];

        cases.forEach(({ input }) => {
          it(`${input}`, () => {
            const decoded = DefaultValue.decode(input);
            const message = pipe(decoded, foldLeftRight);
            const expectedOutput = input;

            expect(getPaths(left(message.errors))).toEqual([]);
            expect(message.schema).toEqual(expectedOutput);
          });
        });
      });
    });

    describe('Validation fails', () => {
      describe('when input is an invalid value', () => {
        const cases = [
          {
            input: {},
            expectedErrors: ['Invalid value "{}" supplied to "DefaultValue<TestType>"'],
          },
          {
            input: { foo: 42 },
            expectedErrors: ['Invalid value "{"foo":42}" supplied to "DefaultValue<TestType>"'],
          },
          {
            input: [],
            expectedErrors: ['Invalid value "[]" supplied to "DefaultValue<TestType>"'],
          },
          {
            input: ['foo', 42],
            expectedErrors: ['Invalid value "["foo",42]" supplied to "DefaultValue<TestType>"'],
          },
        ];

        cases.forEach(({ input, expectedErrors }) => {
          it(`${input}`, () => {
            const decoded = DefaultValue.decode(input);
            const message = pipe(decoded, foldLeftRight);

            expect(getPaths(left(message.errors))).toEqual(expectedErrors);
            expect(message.schema).toEqual({});
          });
        });
      });
    });

    describe('Validation returns specified default value', () => {
      describe('when input is', () => {
        const cases = [{ input: null }, { input: undefined }];

        cases.forEach(({ input }) => {
          it(`${input}`, () => {
            const decoded = DefaultValue.decode(input);
            const message = pipe(decoded, foldLeftRight);
            const expectedOutput = 42;

            expect(getPaths(left(message.errors))).toEqual([]);
            expect(message.schema).toEqual(expectedOutput);
          });
        });
      });
    });
  });
});
