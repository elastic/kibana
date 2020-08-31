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

import moment from 'moment';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { attachMetaData } from '../../../../src/core/server/legacy/logging/legacy_logging_server';
import { createListStream, createPromiseFromStreams } from '../../utils';

import KbnLoggerJsonFormat from './log_format_json';

const time = +moment('2010-01-01T05:15:59Z', moment.ISO_8601);

const makeEvent = (eventType) => ({
  event: eventType,
  timestamp: time,
});

describe('KbnLoggerJsonFormat', () => {
  const config = {};

  describe('event types and messages', () => {
    let format;
    beforeEach(() => {
      format = new KbnLoggerJsonFormat(config);
    });

    it('log', async () => {
      const result = await createPromiseFromStreams([createListStream([makeEvent('log')]), format]);
      const { type, message } = JSON.parse(result);

      expect(type).toBe('log');
      expect(message).toBe('undefined');
    });

    it('response', async () => {
      const event = {
        ...makeEvent('response'),
        statusCode: 200,
        contentLength: 800,
        responseTime: 12000,
        method: 'GET',
        path: '/path/to/resource',
        responsePayload: '1234567879890',
        source: {
          remoteAddress: '127.0.0.1',
          userAgent: 'Test Thing',
          referer: 'elastic.co',
        },
      };
      const result = await createPromiseFromStreams([createListStream([event]), format]);
      const { type, method, statusCode, message } = JSON.parse(result);

      expect(type).toBe('response');
      expect(method).toBe('GET');
      expect(statusCode).toBe(200);
      expect(message).toBe('GET /path/to/resource 200 12000ms - 13.0B');
    });

    it('ops', async () => {
      const event = {
        ...makeEvent('ops'),
        os: {
          load: [1, 1, 2],
        },
      };
      const result = await createPromiseFromStreams([createListStream([event]), format]);
      const { type, message } = JSON.parse(result);

      expect(type).toBe('ops');
      expect(message).toBe('memory: 0.0B uptime: 0:00:00 load: [1.00 1.00 2.00] delay: 0.000');
    });

    describe('with metadata', () => {
      it('logs an event with meta data', async () => {
        const event = {
          data: attachMetaData('message for event', {
            prop1: 'value1',
            prop2: 'value2',
          }),
          tags: ['tag1', 'tag2'],
        };
        const result = await createPromiseFromStreams([createListStream([event]), format]);
        const { level, message, prop1, prop2, tags } = JSON.parse(result);

        expect(level).toBe(undefined);
        expect(message).toBe('message for event');
        expect(prop1).toBe('value1');
        expect(prop2).toBe('value2');
        expect(tags).toEqual(['tag1', 'tag2']);
      });

      it('meta data rewrites event fields', async () => {
        const event = {
          data: attachMetaData('message for event', {
            tags: ['meta-data-tag'],
            prop1: 'value1',
            prop2: 'value2',
          }),
          tags: ['tag1', 'tag2'],
        };
        const result = await createPromiseFromStreams([createListStream([event]), format]);
        const { level, message, prop1, prop2, tags } = JSON.parse(result);

        expect(level).toBe(undefined);
        expect(message).toBe('message for event');
        expect(prop1).toBe('value1');
        expect(prop2).toBe('value2');
        expect(tags).toEqual(['meta-data-tag']);
      });

      it('logs an event with empty meta data', async () => {
        const event = {
          data: attachMetaData('message for event'),
          tags: ['tag1', 'tag2'],
        };
        const result = await createPromiseFromStreams([createListStream([event]), format]);
        const { level, message, prop1, prop2, tags } = JSON.parse(result);

        expect(level).toBe(undefined);
        expect(message).toBe('message for event');
        expect(prop1).toBe(undefined);
        expect(prop2).toBe(undefined);
        expect(tags).toEqual(['tag1', 'tag2']);
      });

      it('does not log meta data for an error event', async () => {
        const event = {
          error: new Error('reason'),
          data: attachMetaData('message for event', {
            prop1: 'value1',
            prop2: 'value2',
          }),
          tags: ['tag1', 'tag2'],
        };
        const result = await createPromiseFromStreams([createListStream([event]), format]);
        const { level, message, prop1, prop2, tags } = JSON.parse(result);

        expect(level).toBe('error');
        expect(message).toBe('reason');
        expect(prop1).toBe(undefined);
        expect(prop2).toBe(undefined);
        expect(tags).toEqual(['tag1', 'tag2']);
      });
    });

    describe('errors', () => {
      it('error type', async () => {
        const event = {
          ...makeEvent('error'),
          error: {
            message: 'test error 0',
          },
        };
        const result = await createPromiseFromStreams([createListStream([event]), format]);
        const { level, message, error } = JSON.parse(result);

        expect(level).toBe('error');
        expect(message).toBe('test error 0');
        expect(error).toEqual({ message: 'test error 0' });
      });

      it('with no message', async () => {
        const event = {
          event: 'error',
          error: {},
        };
        const result = await createPromiseFromStreams([createListStream([event]), format]);
        const { level, message, error } = JSON.parse(result);

        expect(level).toBe('error');
        expect(message).toBe('Unknown error (no message)');
        expect(error).toEqual({});
      });

      it('event error instanceof Error', async () => {
        const event = {
          error: new Error('test error 2'),
        };
        const result = await createPromiseFromStreams([createListStream([event]), format]);
        const { level, message, error } = JSON.parse(result);

        expect(level).toBe('error');
        expect(message).toBe('test error 2');

        expect(error.message).toBe(event.error.message);
        expect(error.name).toBe(event.error.name);
        expect(error.stack).toBe(event.error.stack);
        expect(error.code).toBe(event.error.code);
        expect(error.signal).toBe(event.error.signal);
      });

      it('event error instanceof Error - fatal', async () => {
        const event = {
          error: new Error('test error 2'),
          tags: ['fatal', 'tag2'],
        };
        const result = await createPromiseFromStreams([createListStream([event]), format]);
        const { tags, level, message, error } = JSON.parse(result);

        expect(tags).toEqual(['fatal', 'tag2']);
        expect(level).toBe('fatal');
        expect(message).toBe('test error 2');

        expect(error.message).toBe(event.error.message);
        expect(error.name).toBe(event.error.name);
        expect(error.stack).toBe(event.error.stack);
        expect(error.code).toBe(event.error.code);
        expect(error.signal).toBe(event.error.signal);
      });

      it('event error instanceof Error, no message', async () => {
        const event = {
          error: new Error(''),
        };
        const result = await createPromiseFromStreams([createListStream([event]), format]);
        const { level, message, error } = JSON.parse(result);

        expect(level).toBe('error');
        expect(message).toBe('Unknown error object (no message)');

        expect(error.message).toBe(event.error.message);
        expect(error.name).toBe(event.error.name);
        expect(error.stack).toBe(event.error.stack);
        expect(error.code).toBe(event.error.code);
        expect(error.signal).toBe(event.error.signal);
      });
    });
  });

  describe('timezone', () => {
    it('logs in UTC', async () => {
      const format = new KbnLoggerJsonFormat({
        timezone: 'UTC',
      });

      const result = await createPromiseFromStreams([createListStream([makeEvent('log')]), format]);

      const { '@timestamp': timestamp } = JSON.parse(result);
      expect(timestamp).toBe(moment.utc(time).format());
    });

    it('logs in local timezone timezone is undefined', async () => {
      const format = new KbnLoggerJsonFormat({});

      const result = await createPromiseFromStreams([createListStream([makeEvent('log')]), format]);

      const { '@timestamp': timestamp } = JSON.parse(result);
      expect(timestamp).toBe(moment(time).format());
    });
  });
});
