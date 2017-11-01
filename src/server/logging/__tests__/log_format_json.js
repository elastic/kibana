import moment from 'moment';
import expect from 'expect.js';

import {
  createListStream,
  createPromiseFromStreams,
} from '../../../utils';

import KbnLoggerJsonFormat from '../log_format_json';

const time = moment('2010-01-01T05:15:59Z', moment.ISO_8601);

const makeEvent = () => ({
  event: 'log',
  timestamp: time.valueOf(),
  tags: ['tag'],
  pid: 1,
  data: 'my log message'
});

describe('KbnLoggerJsonFormat', () => {
  it('logs in UTC when useUTC is true', async () => {
    const format = new KbnLoggerJsonFormat({
      useUTC: true
    });

    const result = await createPromiseFromStreams([
      createListStream([makeEvent()]),
      format
    ]);

    const { '@timestamp': timestamp } = JSON.parse(result);
    expect(timestamp).to.eql(time.clone().utc().format());
  });

  it('logs in local timezone when useUTC is false', async () => {
    const format = new KbnLoggerJsonFormat({
      useUTC: false
    });

    const result = await createPromiseFromStreams([
      createListStream([makeEvent()]),
      format
    ]);

    const { '@timestamp': timestamp } = JSON.parse(result);
    expect(timestamp).to.eql(time.clone().format());
  });
});
