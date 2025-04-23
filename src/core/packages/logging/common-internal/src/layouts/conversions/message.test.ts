/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LogLevel, LogRecord } from '@kbn/logging';
import { MessageConversion } from './message';

const baseRecord: LogRecord = {
  pid: 1,
  timestamp: new Date(),
  level: LogLevel.Info,
  context: '',
  message: '',
};

describe('MessageConversion', () => {
  test('it should keep break lines', () => {
    expect(
      MessageConversion.convert({ ...baseRecord, message: 'Hi!\nHow are you?' }, false)
    ).toEqual('Hi!\nHow are you?');
  });

  test('it should encode/escape ANSI chars lines from the message', () => {
    expect(
      MessageConversion.convert(
        { ...baseRecord, message: 'Blinking...\u001b[5;7;6mThis is Fine\u001b[27m' },
        false
      )
    ).toEqual('Blinking...\\u001b[5;7;6mThis is Fine\\u001b[27m');
  });

  test('it should encode/escape any unicode injection from the message', () => {
    expect(
      MessageConversion.convert(
        {
          ...baseRecord,
          message:
            '\u001b[31mESC-INJECTION-LFUNICODE:\u001b[32mSUCCESSFUL\u001b[0m\u0007\n\nInjecting 10.000 lols 😂\u001b[10000;b\u0007',
        },
        false
      )
    ).toEqual(
      '\\u001b[31mESC-INJECTION-LFUNICODE:\\u001b[32mSUCCESSFUL\\u001b[0m\\u0007\n\nInjecting 10.000 lols 😂\\u001b[10000;b\\u0007'
    );
  });

  test('it should encode/escape any unicode injection from the message (including nullbyte)', () => {
    expect(
      MessageConversion.convert(
        {
          ...baseRecord,
          message:
            '\u001b\u0000[31mESC-INJECTION-LFUNICODE:\u001b[32mSUCCESSFUL\u001b[0m\u0007\n\nInjecting 10.000 lols 😂\u001b[10000;b\u0007',
        },
        false
      )
    ).toEqual(
      '\\u001b\\u0000[31mESC-INJECTION-LFUNICODE:\\u001b[32mSUCCESSFUL\\u001b[0m\\u0007\n\nInjecting 10.000 lols 😂\\u001b[10000;b\\u0007'
    );
  });

  test('it should encode/escape ANSI chars lines from the message when not a string', () => {
    expect(
      MessageConversion.convert(
        {
          ...baseRecord,
          // @ts-expect-error message is supposed to be a string
          message: {
            toString: () => 'toString...\u001b[5;7;6mThis is Fine\u001b[27m',
          },
        },
        false
      )
    ).toEqual('toString...\\u001b[5;7;6mThis is Fine\\u001b[27m');
  });

  test('it should encode/escape ANSI chars lines from the error stack', () => {
    const error = new Error('Something went bad');
    error.stack = 'stack...\u001b[5;7;6mThis is Fine\u001b[27m';
    expect(
      MessageConversion.convert(
        {
          ...baseRecord,
          message: 'Some message that will be ignored',
          error,
        },
        false
      )
    ).toEqual('stack...\\u001b[5;7;6mThis is Fine\\u001b[27m');
  });

  test('it should encode/escape ANSI chars lines from the error stack when not a string', () => {
    expect(
      MessageConversion.convert(
        {
          ...baseRecord,
          message: 'Some message that will be ignored',
          error: {
            // @ts-expect-error message is supposed to be a string
            stack: {
              toString: () => 'stackToString...\u001b[5;7;6mThis is Fine\u001b[27m',
            },
          },
        },
        false
      )
    ).toEqual('stackToString...\\u001b[5;7;6mThis is Fine\\u001b[27m');
  });

  test('it should format an AggregateError with multiple causes', () => {
    const firstError = new Error('first error');
    firstError.stack = 'Error: first error\n    at foo';

    const secondError = new Error('second error');
    secondError.stack = 'Error: second error\n    at bar';

    const agg = new AggregateError([firstError, secondError], 'aggregate failed');
    agg.stack = 'AggregateError: aggregate failed\n    at baz\n    at qux';

    const result = MessageConversion.convert({ ...baseRecord, error: agg }, false);

    expect(result).toEqual(
      [
        'AggregateError: aggregate failed. Caused by:',
        '    > Error: first error',
        '    > at foo',
        '    > Error: second error',
        '    > at bar',
        '    at baz',
        '    at qux',
      ].join('\n')
    );
  });

  test('it should omit duplicate frames between cause and aggregate stack', () => {
    const cause = new Error('cause error');
    cause.stack = 'Error: cause error\n    at shared\n    at unique';

    const agg = new AggregateError([cause], 'aggregate');
    agg.stack = 'AggregateError: aggregate\n    at shared\n    at extended';

    const result = MessageConversion.convert({ ...baseRecord, error: agg }, false);

    expect(result).toEqual(
      [
        'AggregateError: aggregate. Caused by:',
        '    > Error: cause error',
        '    at shared',
        '    at extended',
      ].join('\n')
    );
  });
});
