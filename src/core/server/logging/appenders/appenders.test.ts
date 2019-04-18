/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { mockCreateLayout } from './appenders.test.mocks';

import { LegacyAppender } from '../../legacy/logging/appenders/legacy_appender';
import { Appenders } from './appenders';
import { ConsoleAppender } from './console/console_appender';
import { FileAppender } from './file/file_appender';

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
});
