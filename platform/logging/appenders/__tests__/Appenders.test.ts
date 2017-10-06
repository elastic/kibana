import * as mockSchema from '../../../lib/schema';

const mockCreateLayoutConfigSchema = jest.fn();
const mockCreateLayout = jest.fn();
jest.mock('../../layouts/Layouts', () => ({
  Layouts: {
    createConfigSchema: mockCreateLayoutConfigSchema,
    create: mockCreateLayout
  }
}));

import { ConsoleAppender } from '../console/ConsoleAppender';
import { FileAppender } from '../file/FileAppender';
import { LegacyAppender } from '../../../legacy/logging/appenders/LegacyAppender';
import { Appenders } from '../Appenders';

beforeEach(() => {
  mockCreateLayoutConfigSchema.mockReset();
  mockCreateLayout.mockReset();
});

test('`createConfigSchema()` creates correct schema.', () => {
  mockCreateLayoutConfigSchema.mockReturnValue(
    mockSchema.object({
      kind: mockSchema.literal('mock')
    })
  );

  const appendersSchema = Appenders.createConfigSchema(mockSchema);
  const validConfig1 = { kind: 'file', layout: { kind: 'mock' }, path: 'path' };
  expect(appendersSchema.validate(validConfig1)).toEqual({
    kind: 'file',
    layout: { kind: 'mock' },
    path: 'path'
  });

  const validConfig2 = { kind: 'console', layout: { kind: 'mock' } };
  expect(appendersSchema.validate(validConfig2)).toEqual({
    kind: 'console',
    layout: { kind: 'mock' }
  });

  const wrongConfig1 = {
    kind: 'console',
    layout: { kind: 'mock' },
    path: 'path'
  };
  expect(() => appendersSchema.validate(wrongConfig1)).toThrow();

  const wrongConfig2 = { kind: 'file', layout: { kind: 'mock' } };
  expect(() => appendersSchema.validate(wrongConfig2)).toThrow();

  const wrongConfig3 = {
    kind: 'console',
    layout: { kind: 'mock' },
    path: 'path'
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
        highlight: true
      }
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
        highlight: true
      }
    },
    {} as any
  );
  expect(fileAppender).toBeInstanceOf(FileAppender);
});

test('`create()` fails to create legacy appender if kbnServer is not provided.', () => {
  expect(() => {
    Appenders.create({ kind: 'legacy-appender' }, {
      getLegacyKbnServer() {}
    } as any);
  }).toThrowErrorMatchingSnapshot();
});

test('`create()` creates legacy appender if kbnServer is provided.', () => {
  const legacyAppender = Appenders.create({ kind: 'legacy-appender' }, {
    getLegacyKbnServer: () => ({})
  } as any);

  expect(legacyAppender).toBeInstanceOf(LegacyAppender);
});
