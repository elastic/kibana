/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mockCreateLayout } from './appenders.test.mocks';

import { ByteSizeValue } from '@kbn/config-schema';
import { Appenders } from './appenders';
import { ConsoleAppender } from './console/console_appender';
import { FileAppender } from './file/file_appender';
import { RollingFileAppender } from './rolling_file/rolling_file_appender';

beforeEach(() => {
  mockCreateLayout.mockReset();
});

test('`configSchema` creates correct schema.', () => {
  const appendersSchema = Appenders.configSchema;
  const validConfig1 = { type: 'file', layout: { type: 'mock' }, fileName: 'path' };
  expect(appendersSchema.validate(validConfig1)).toEqual({
    type: 'file',
    layout: { type: 'mock' },
    fileName: 'path',
  });

  const validConfig2 = { type: 'console', layout: { type: 'mock' } };
  expect(appendersSchema.validate(validConfig2)).toEqual({
    type: 'console',
    layout: { type: 'mock' },
  });

  const wrongConfig1 = {
    type: 'console',
    layout: { type: 'mock' },
    fileName: 'path',
  };
  expect(() => appendersSchema.validate(wrongConfig1)).toThrow();

  const wrongConfig2 = { type: 'file', layout: { type: 'mock' } };
  expect(() => appendersSchema.validate(wrongConfig2)).toThrow();

  const wrongConfig3 = {
    type: 'console',
    layout: { type: 'mock' },
    fileName: 'path',
  };
  expect(() => appendersSchema.validate(wrongConfig3)).toThrow();
});

test('`create()` creates correct appender.', () => {
  mockCreateLayout.mockReturnValue({ format: () => '' });

  const consoleAppender = Appenders.create({
    type: 'console',
    layout: { highlight: true, type: 'pattern', pattern: '' },
  });
  expect(consoleAppender).toBeInstanceOf(ConsoleAppender);

  const fileAppender = Appenders.create({
    type: 'file',
    layout: { highlight: true, type: 'pattern', pattern: '' },
    fileName: 'path',
  });
  expect(fileAppender).toBeInstanceOf(FileAppender);

  const rollingFileAppender = Appenders.create({
    type: 'rolling-file',
    fileName: 'path',
    layout: { highlight: true, type: 'pattern', pattern: '' },
    strategy: { type: 'numeric', max: 5, pattern: '%i' },
    policy: { type: 'size-limit', size: ByteSizeValue.parse('15b') },
  });
  expect(rollingFileAppender).toBeInstanceOf(RollingFileAppender);
});
