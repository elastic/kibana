/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';

import { attachMetaData } from './metadata';
import { createListStream, createPromiseFromStreams } from '@kbn/utils';
import { KbnLoggerJsonFormat } from './log_format_json';

const time = +moment('2010-01-01T05:15:59Z', moment.ISO_8601);

const makeEvent = (eventType: string) => ({
  event: eventType,
  timestamp: time,
});

describe('KbnLoggerJsonFormat', () => {
  const config: any = {};

  describe('event types and messages', () => {
    let format: KbnLoggerJsonFormat;
    beforeEach(() => {
      format = new KbnLoggerJsonFormat(config);
    });

    it('log', async () => {
      const result = await createPromiseFromStreams<string>([
        createListStream([makeEvent('log')]),
        format,
      ]);
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
      const result = await createPromiseFromStreams<string>([createListStream([event]), format]);
      const { type, method, statusCode, message, req } = JSON.parse(result);

      expect(type).toBe('response');
      expect(method).toBe('GET');
      expect(statusCode).toBe(200);
      expect(message).toBe('GET /path/to/resource 200 12000ms - 13.0B');
      expect(req.remoteAddress).toBe('127.0.0.1');
      expect(req.userAgent).toBe('Test Thing');
    });

    it('ops', async () => {
      const event = {
        ...makeEvent('ops'),
        os: {
          load: [1, 1, 2],
        },
      };
      const result = await createPromiseFromStreams<string>([createListStream([event]), format]);
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
        const result = await createPromiseFromStreams<string>([createListStream([event]), format]);
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
        const result = await createPromiseFromStreams<string>([createListStream([event]), format]);
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
        const result = await createPromiseFromStreams<string>([createListStream([event]), format]);
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
        const result = await createPromiseFromStreams<string>([createListStream([event]), format]);
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
        const result = await createPromiseFromStreams<string>([createListStream([event]), format]);
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
        const result = await createPromiseFromStreams<string>([createListStream([event]), format]);
        const { level, message, error } = JSON.parse(result);

        expect(level).toBe('error');
        expect(message).toBe('Unknown error (no message)');
        expect(error).toEqual({});
      });

      it('event error instanceof Error', async () => {
        const event = {
          error: new Error('test error 2') as any,
        };
        const result = await createPromiseFromStreams<string>([createListStream([event]), format]);
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
          error: new Error('test error 2') as any,
          tags: ['fatal', 'tag2'],
        };
        const result = await createPromiseFromStreams<string>([createListStream([event]), format]);
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
          error: new Error('') as any,
        };
        const result = await createPromiseFromStreams<string>([createListStream([event]), format]);
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
      } as any);

      const result = await createPromiseFromStreams<string>([
        createListStream([makeEvent('log')]),
        format,
      ]);

      const { '@timestamp': timestamp } = JSON.parse(result);
      expect(timestamp).toBe(moment.utc(time).format());
    });

    it('logs in local timezone timezone is undefined', async () => {
      const format = new KbnLoggerJsonFormat({} as any);

      const result = await createPromiseFromStreams<string>([
        createListStream([makeEvent('log')]),
        format,
      ]);

      const { '@timestamp': timestamp } = JSON.parse(result);
      expect(timestamp).toBe(moment(time).format());
    });
  });
});
