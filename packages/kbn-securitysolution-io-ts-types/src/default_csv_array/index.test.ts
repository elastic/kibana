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
import { defaultCsvArray } from '.';

describe('defaultCsvArray', () => {
  describe('Creates a schema of an array that works in the following way:', () => {
    type TestType = t.TypeOf<typeof TestType>;
    const TestType = t.union(
      [t.literal('foo'), t.literal('bar'), t.literal('42'), t.null, t.undefined],
      'TestType'
    );

    const TestCsvArray = defaultCsvArray(TestType);

    describe('Name of the schema', () => {
      it('has a default value', () => {
        const CsvArray = defaultCsvArray(TestType);
        expect(CsvArray.name).toEqual('DefaultCsvArray<TestType>');
      });

      it('can be overriden', () => {
        const CsvArray = defaultCsvArray(TestType, 'CustomName');
        expect(CsvArray.name).toEqual('CustomName');
      });
    });

    describe('Validation succeeds', () => {
      describe('when input is a single valid string value', () => {
        const cases = [{ input: 'foo' }, { input: 'bar' }, { input: '42' }];

        cases.forEach(({ input }) => {
          it(`${input}`, () => {
            const decoded = TestCsvArray.decode(input);
            const message = pipe(decoded, foldLeftRight);
            const expectedOutput = [input]; // note that it's an array after decode

            expect(getPaths(left(message.errors))).toEqual([]);
            expect(message.schema).toEqual(expectedOutput);
          });
        });
      });

      describe('when input is an array of valid string values', () => {
        const cases = [
          { input: ['foo'] },
          { input: ['foo', 'bar'] },
          { input: ['foo', 'bar', '42'] },
        ];

        cases.forEach(({ input }) => {
          it(`${input}`, () => {
            const decoded = TestCsvArray.decode(input);
            const message = pipe(decoded, foldLeftRight);
            const expectedOutput = input;

            expect(getPaths(left(message.errors))).toEqual([]);
            expect(message.schema).toEqual(expectedOutput);
          });
        });
      });

      describe('when input is a string which is a comma-separated array of valid values', () => {
        const cases = [
          {
            input: 'foo,bar',
            expectedOutput: ['foo', 'bar'],
          },
          {
            input: 'foo,bar,42',
            expectedOutput: ['foo', 'bar', '42'],
          },
        ];

        cases.forEach(({ input, expectedOutput }) => {
          it(`${input}`, () => {
            const decoded = TestCsvArray.decode(input);
            const message = pipe(decoded, foldLeftRight);

            expect(getPaths(left(message.errors))).toEqual([]);
            expect(message.schema).toEqual(expectedOutput);
          });
        });
      });
    });

    describe('Validation fails', () => {
      describe('when input is a single invalid value', () => {
        const cases = [
          {
            input: 'val',
            expectedErrors: ['Invalid value "val" supplied to "DefaultCsvArray<TestType>"'],
          },
          {
            input: '5',
            expectedErrors: ['Invalid value "5" supplied to "DefaultCsvArray<TestType>"'],
          },
          {
            input: 5,
            expectedErrors: ['Invalid value "5" supplied to "DefaultCsvArray<TestType>"'],
          },
          {
            input: {},
            expectedErrors: ['Invalid value "{}" supplied to "DefaultCsvArray<TestType>"'],
          },
        ];

        cases.forEach(({ input, expectedErrors }) => {
          it(`${input}`, () => {
            const decoded = TestCsvArray.decode(input);
            const message = pipe(decoded, foldLeftRight);

            expect(getPaths(left(message.errors))).toEqual(expectedErrors);
            expect(message.schema).toEqual({});
          });
        });
      });

      describe('when input is an array of invalid values', () => {
        const cases = [
          {
            input: ['value 1', 5],
            expectedErrors: [
              'Invalid value "value 1" supplied to "DefaultCsvArray<TestType>"',
              'Invalid value "5" supplied to "DefaultCsvArray<TestType>"',
            ],
          },
          {
            input: ['value 1', 'foo'],
            expectedErrors: ['Invalid value "value 1" supplied to "DefaultCsvArray<TestType>"'],
          },
          {
            input: ['', 5, {}],
            expectedErrors: [
              'Invalid value "" supplied to "DefaultCsvArray<TestType>"',
              'Invalid value "5" supplied to "DefaultCsvArray<TestType>"',
              'Invalid value "{}" supplied to "DefaultCsvArray<TestType>"',
            ],
          },
        ];

        cases.forEach(({ input, expectedErrors }) => {
          it(`${input}`, () => {
            const decoded = TestCsvArray.decode(input);
            const message = pipe(decoded, foldLeftRight);

            expect(getPaths(left(message.errors))).toEqual(expectedErrors);
            expect(message.schema).toEqual({});
          });
        });
      });

      describe('when input is a string which is a comma-separated array of invalid values', () => {
        const cases = [
          {
            input: 'value 1,5',
            expectedErrors: [
              'Invalid value "value 1" supplied to "DefaultCsvArray<TestType>"',
              'Invalid value "5" supplied to "DefaultCsvArray<TestType>"',
            ],
          },
          {
            input: 'value 1,foo',
            expectedErrors: ['Invalid value "value 1" supplied to "DefaultCsvArray<TestType>"'],
          },
          {
            input: ',5,{}',
            expectedErrors: [
              'Invalid value "" supplied to "DefaultCsvArray<TestType>"',
              'Invalid value "5" supplied to "DefaultCsvArray<TestType>"',
              'Invalid value "{}" supplied to "DefaultCsvArray<TestType>"',
            ],
          },
        ];

        cases.forEach(({ input, expectedErrors }) => {
          it(`${input}`, () => {
            const decoded = TestCsvArray.decode(input);
            const message = pipe(decoded, foldLeftRight);

            expect(getPaths(left(message.errors))).toEqual(expectedErrors);
            expect(message.schema).toEqual({});
          });
        });
      });
    });

    describe('Validation returns default value (an empty array)', () => {
      describe('when input is', () => {
        const cases = [{ input: null }, { input: undefined }, { input: '' }, { input: [] }];

        cases.forEach(({ input }) => {
          it(`${input}`, () => {
            const decoded = TestCsvArray.decode(input);
            const message = pipe(decoded, foldLeftRight);
            const expectedOutput: string[] = [];

            expect(getPaths(left(message.errors))).toEqual([]);
            expect(message.schema).toEqual(expectedOutput);
          });
        });
      });
    });
  });
});
