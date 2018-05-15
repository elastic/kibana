const mockCreateLayout = jest.fn();
jest.mock('../../layouts/layouts', () => {
  const { schema } = require('../../../config/schema');
  return {
    Layouts: {
      create: mockCreateLayout,
      configSchema: schema.object({
        kind: schema.literal('mock'),
      }),
    },
  };
});

import { ConsoleAppender } from '../console/console_appender';
import { FileAppender } from '../file/file_appender';
import { LegacyAppender } from '../../../legacy_compat/logging/appenders/legacy_appender';
import { Appenders } from '../appenders';

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

  const consoleAppender = Appenders.create(
    {
      kind: 'console',
      layout: {
        kind: 'pattern',
        pattern: '',
        highlight: true,
      },
    },
    {} as any
  );
  expect(consoleAppender).toBeInstanceOf(ConsoleAppender);

  const fileAppender = Appenders.create(
    {
      kind: 'file',
      path: 'path',
      layout: {
        kind: 'pattern',
        pattern: '',
        highlight: true,
      },
    },
    {} as any
  );
  expect(fileAppender).toBeInstanceOf(FileAppender);
});

test('`create()` fails to create legacy appender if kbnServer is not provided.', () => {
  expect(() => {
    Appenders.create({ kind: 'legacy-appender' }, {
      getLegacyKbnServer() {},
    } as any);
  }).toThrowErrorMatchingSnapshot();
});

test('`create()` creates legacy appender if kbnServer is provided.', () => {
  const legacyAppender = Appenders.create({ kind: 'legacy-appender' }, {
    getLegacyKbnServer: () => ({}),
  } as any);

  expect(legacyAppender).toBeInstanceOf(LegacyAppender);
});
