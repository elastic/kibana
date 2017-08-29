import * as mockSchema from '../../../lib/schema';

import { LogLevel } from '../../LogLevel';
import { LogRecord } from '../../LogRecord';
import { JsonLayout } from '../JsonLayout';

const records: LogRecord[] = [
  {
    timestamp: new Date(Date.UTC(2012, 1, 1)),
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
    timestamp: new Date(Date.UTC(2012, 1, 1)),
    message: 'message-2',
    context: 'context-2',
    level: LogLevel.Error
  },
  {
    timestamp: new Date(Date.UTC(2012, 1, 1)),
    message: 'message-3',
    context: 'context-3',
    level: LogLevel.Warn
  },
  {
    timestamp: new Date(Date.UTC(2012, 1, 1)),
    message: 'message-4',
    context: 'context-4',
    level: LogLevel.Debug
  },
  {
    timestamp: new Date(Date.UTC(2012, 1, 1)),
    message: 'message-5',
    context: 'context-5',
    level: LogLevel.Info
  },
  {
    timestamp: new Date(Date.UTC(2012, 1, 1)),
    message: 'message-6',
    context: 'context-6',
    level: LogLevel.Trace
  }
];

test('`createConfigSchema()` creates correct schema.', () => {
  const layoutSchema = JsonLayout.createConfigSchema(mockSchema);

  expect(layoutSchema.validate({ kind: 'json' })).toEqual({ kind: 'json' });
});

test('`format()` correctly formats record.', () => {
  const layout = new JsonLayout();

  for (const record of records) {
    expect(layout.format(record)).toMatchSnapshot();
  }
});
