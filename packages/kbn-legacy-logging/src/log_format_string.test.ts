/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import moment from 'moment';

import { attachMetaData } from './metadata';
import { createListStream, createPromiseFromStreams } from '@kbn/utils';
import { KbnLoggerStringFormat } from './log_format_string';

const time = +moment('2010-01-01T05:15:59Z', moment.ISO_8601);

const makeEvent = () => ({
  event: 'log',
  timestamp: time,
  tags: ['tag'],
  pid: 1,
  data: 'my log message',
});

describe('KbnLoggerStringFormat', () => {
  it('logs in UTC', async () => {
    const format = new KbnLoggerStringFormat({
      timezone: 'UTC',
    } as any);

    const result = await createPromiseFromStreams([createListStream([makeEvent()]), format]);

    expect(String(result)).toContain(moment.utc(time).format('HH:mm:ss.SSS'));
  });

  it('logs in local timezone when timezone is undefined', async () => {
    const format = new KbnLoggerStringFormat({} as any);

    const result = await createPromiseFromStreams([createListStream([makeEvent()]), format]);

    expect(String(result)).toContain(moment(time).format('HH:mm:ss.SSS'));
  });
  describe('with metadata', () => {
    it('does not log meta data', async () => {
      const format = new KbnLoggerStringFormat({} as any);
      const event = {
        data: attachMetaData('message for event', {
          prop1: 'value1',
        }),
        tags: ['tag1', 'tag2'],
      };

      const result = await createPromiseFromStreams([createListStream([event]), format]);

      const resultString = String(result);
      expect(resultString).toContain('tag1');
      expect(resultString).toContain('tag2');
      expect(resultString).toContain('message for event');

      expect(resultString).not.toContain('value1');
      expect(resultString).not.toContain('prop1');
    });
  });
});
