/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
    ).toEqual('Blinking...%1B[5;7;6mThis is Fine%1B[27m');
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
      '%1B[31mESC-INJECTION-LFUNICODE:%1B[32mSUCCESSFUL%1B[0m%07\n\nInjecting 10.000 lols 😂%1B[10000;b%07'
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
      '%1B%00[31mESC-INJECTION-LFUNICODE:%1B[32mSUCCESSFUL%1B[0m%07\n\nInjecting 10.000 lols 😂%1B[10000;b%07'
    );
  });
});
