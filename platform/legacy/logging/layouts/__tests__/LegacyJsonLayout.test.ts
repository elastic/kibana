import * as mockSchema from '../../../../lib/schema';

import { LogLevel } from '../../../../logging/LogLevel';
import { LogRecord } from '../../../../logging/LogRecord';
import { LegacyJsonLayout } from '../LegacyJsonLayout';

global.process.pid = 1234;

const timestamp = new Date(Date.UTC(2012, 1, 1, 11, 22, 33, 44));
const records: LogRecord[] = [
  {
    timestamp,
    message: 'message-1',
    context: 'context-1',
    error: {
      message: 'Some error message',
      name: 'Some error name',
      stack: 'Some error stack'
    },
    level: LogLevel.Fatal
  },
  {
    timestamp,
    message: 'message-2',
    context: 'context-2',
    level: LogLevel.Error
  },
  {
    timestamp,
    message: 'message-2',
    context: 'context-2.sub-context-2.sub-sub-context-2',
    level: LogLevel.Error
  },
  {
    timestamp,
    message: 'message-3',
    context: 'context-3',
    level: LogLevel.Warn
  },
  {
    timestamp,
    message: 'message-4',
    context: 'context-4',
    level: LogLevel.Debug
  },
  {
    timestamp,
    message: 'message-5',
    context: 'context-5',
    level: LogLevel.Info
  },
  {
    timestamp,
    message: 'message-5',
    context: 'context-5.sub-context-5',
    level: LogLevel.Info
  },
  {
    timestamp,
    message: 'message-6',
    context: 'context-6',
    level: LogLevel.Trace
  }
];

test('`createConfigSchema()` creates correct schema.', () => {
  const layoutSchema = LegacyJsonLayout.createConfigSchema(mockSchema);

  expect(layoutSchema.validate({ kind: 'legacy-json' })).toEqual({
    kind: 'legacy-json'
  });
});

test('`format()` correctly formats record.', () => {
  const layout = new LegacyJsonLayout();

  for (const record of records) {
    expect(layout.format(record)).toMatchSnapshot();
  }
});
