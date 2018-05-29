import { LogLevel } from '../../log_level';
import { LogRecord } from '../../log_record';
import { JsonLayout } from '../json_layout';

const records: LogRecord[] = [
  {
    context: 'context-1',
    error: {
      message: 'Some error message',
      name: 'Some error name',
      stack: 'Some error stack',
    },
    level: LogLevel.Fatal,
    message: 'message-1',
    timestamp: new Date(Date.UTC(2012, 1, 1)),
  },
  {
    context: 'context-2',
    level: LogLevel.Error,
    message: 'message-2',
    timestamp: new Date(Date.UTC(2012, 1, 1)),
  },
  {
    context: 'context-3',
    level: LogLevel.Warn,
    message: 'message-3',
    timestamp: new Date(Date.UTC(2012, 1, 1)),
  },
  {
    context: 'context-4',
    level: LogLevel.Debug,
    message: 'message-4',
    timestamp: new Date(Date.UTC(2012, 1, 1)),
  },
  {
    context: 'context-5',
    level: LogLevel.Info,
    message: 'message-5',
    timestamp: new Date(Date.UTC(2012, 1, 1)),
  },
  {
    context: 'context-6',
    level: LogLevel.Trace,
    message: 'message-6',
    timestamp: new Date(Date.UTC(2012, 1, 1)),
  },
];

test('`createConfigSchema()` creates correct schema.', () => {
  const layoutSchema = JsonLayout.configSchema;

  expect(layoutSchema.validate({ kind: 'json' })).toEqual({ kind: 'json' });
});

test('`format()` correctly formats record.', () => {
  const layout = new JsonLayout();

  for (const record of records) {
    expect(layout.format(record)).toMatchSnapshot();
  }
});
