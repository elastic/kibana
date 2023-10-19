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

  test('it should remove ANSI chars lines from the message', () => {
    expect(
      MessageConversion.convert(
        { ...baseRecord, message: 'Blinking...\u001b[5;7;6mThis is Fine\u001b[27m' },
        false
      )
    ).toEqual('Blinking...This is Fine');
  });

  test('it should remove any unicode injection from the message', () => {
    expect(
      MessageConversion.convert(
        {
          ...baseRecord,
          message:
            '\u001b[31mESC-INJECTION-LFUNICODE:\u001b[32mSUCCESSFUL\u001b[0m\u0007\n\nInjecting 10.000 lols 😂\u001b[10000;b\u0007',
        },
        false
      )
    ).toEqual('ESC-INJECTION-LFUNICODE:SUCCESSFUL\n\nInjecting 10.000 lols 😂');
  });
});
