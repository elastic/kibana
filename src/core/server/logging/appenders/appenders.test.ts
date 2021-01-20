/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { mockCreateLayout } from './appenders.test.mocks';

import { ByteSizeValue } from '@kbn/config-schema';
import { LegacyAppender } from '../../legacy/logging/appenders/legacy_appender';
import { Appenders } from './appenders';
import { ConsoleAppender } from './console/console_appender';
import { FileAppender } from './file/file_appender';
import { RollingFileAppender } from './rolling_file/rolling_file_appender';

beforeEach(() => {
  mockCreateLayout.mockReset();
});

test('`configSchema` creates correct schema.', () => {
  const appendersSchema = Appenders.configSchema;
  const validConfig1 = { kind: 'file', layout: { kind: 'mock' }, path: 'path' };
  expect(appendersSchema.validate(validConfig1)).toEqual({
    kind: 'file',
    layout: { kind: 'mock' },
    path: 'path',
  });

  const validConfig2 = { kind: 'console', layout: { kind: 'mock' } };
  expect(appendersSchema.validate(validConfig2)).toEqual({
    kind: 'console',
    layout: { kind: 'mock' },
  });

  const wrongConfig1 = {
    kind: 'console',
    layout: { kind: 'mock' },
    path: 'path',
  };
  expect(() => appendersSchema.validate(wrongConfig1)).toThrow();

  const wrongConfig2 = { kind: 'file', layout: { kind: 'mock' } };
  expect(() => appendersSchema.validate(wrongConfig2)).toThrow();

  const wrongConfig3 = {
    kind: 'console',
    layout: { kind: 'mock' },
    path: 'path',
  };
  expect(() => appendersSchema.validate(wrongConfig3)).toThrow();
});

test('`create()` creates correct appender.', () => {
  mockCreateLayout.mockReturnValue({ format: () => '' });

  const consoleAppender = Appenders.create({
    kind: 'console',
    layout: { highlight: true, kind: 'pattern', pattern: '' },
  });
  expect(consoleAppender).toBeInstanceOf(ConsoleAppender);

  const fileAppender = Appenders.create({
    kind: 'file',
    layout: { highlight: true, kind: 'pattern', pattern: '' },
    path: 'path',
  });
  expect(fileAppender).toBeInstanceOf(FileAppender);

  const legacyAppender = Appenders.create({
    kind: 'legacy-appender',
    legacyLoggingConfig: { verbose: true },
  });

  expect(legacyAppender).toBeInstanceOf(LegacyAppender);

  const rollingFileAppender = Appenders.create({
    kind: 'rolling-file',
    path: 'path',
    layout: { highlight: true, kind: 'pattern', pattern: '' },
    strategy: { kind: 'numeric', max: 5, pattern: '%i' },
    policy: { kind: 'size-limit', size: ByteSizeValue.parse('15b') },
  });
  expect(rollingFileAppender).toBeInstanceOf(RollingFileAppender);
});
