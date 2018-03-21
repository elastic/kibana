import moment from 'moment';

import {
  createListStream,
  createPromiseFromStreams,
} from '../../utils';

import KbnLoggerStringFormat from './log_format_string';

const time = +moment('2010-01-01T05:15:59Z', moment.ISO_8601);

const makeEvent = () => ({
  event: 'log',
  timestamp: time,
  tags: ['tag'],
  pid: 1,
  data: 'my log message'
});

describe('KbnLoggerStringFormat', () => {
  it('logs in UTC when useUTC is true', async () => {
    const format = new KbnLoggerStringFormat({
      useUTC: true
    });

    const result = await createPromiseFromStreams([
      createListStream([makeEvent()]),
      format
    ]);

    expect(String(result))
      .toContain(moment.utc(time).format('HH:mm:ss.SSS'));
  });

  it('logs in local timezone when useUTC is false', async () => {
    const format = new KbnLoggerStringFormat({
      useUTC: false
    });

    const result = await createPromiseFromStreams([
      createListStream([makeEvent()]),
      format
    ]);

    expect(String(result))
      .toContain(moment(time).format('HH:mm:ss.SSS'));
  });
});
