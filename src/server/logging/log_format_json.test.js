import moment from 'moment';

import {
  createListStream,
  createPromiseFromStreams,
} from '../../utils';

import KbnLoggerJsonFormat from './log_format_json';

const time = +moment('2010-01-01T05:15:59Z', moment.ISO_8601);

const makeEvent = eventType => ({
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
      const result = await createPromiseFromStreams([
        createListStream([makeEvent('log')]),
        format
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
        }
      };
      const result = await createPromiseFromStreams([
        createListStream([event]),
        format
      ]);
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
          load: [1, 1, 2]
        }
      };
      const result = await createPromiseFromStreams([
        createListStream([event]),
        format
      ]);
      const { type, message } = JSON.parse(result);

      expect(type).toBe('ops');
      expect(message).toBe('memory: 0.0B uptime: 0:00:00 load: [1.00 1.00 2.00] delay: 0.000');
    });

    describe('errors', () => {
      it('error type', async () => {
        const event = {
          ...makeEvent('error'),
          error: {
            message: 'test error 0'
          }
        };
        const result = await createPromiseFromStreams([
          createListStream([event]),
          format
        ]);
        const { level, message, error } = JSON.parse(result);

        expect(level).toBe('error');
        expect(message).toBe('test error 0');
        expect(error).toEqual({ message: 'test error 0' });
      });

      it('with no message', async () => {
        const event = {
          event: 'error',
          error: {}
        };
        const result = await createPromiseFromStreams([
          createListStream([event]),
          format
        ]);
        const { level, message, error } = JSON.parse(result);

        expect(level).toBe('error');
        expect(message).toBe('Unknown error (no message)');
        expect(error).toEqual({});
      });

      it('event data instanceof Error', async () => {
        const event = {
          data: new Error('test error 2'),
        };
        const result = await createPromiseFromStreams([
          createListStream([event]),
          format
        ]);
        const { level, message, error } = JSON.parse(result);

        expect(level).toBe('error');
        expect(message).toBe('test error 2');

        expect(error.message).toBe(event.data.message);
        expect(error.name).toBe(event.data.name);
        expect(error.stack).toBe(event.data.stack);
        expect(error.code).toBe(event.data.code);
        expect(error.signal).toBe(event.data.signal);
      });

      it('event data instanceof Error - fatal', async () => {
        const event = {
          data: new Error('test error 2'),
          tags: ['fatal', 'tag2']
        };
        const result = await createPromiseFromStreams([
          createListStream([event]),
          format
        ]);
        const { tags, level, message, error } = JSON.parse(result);

        expect(tags).toEqual(['fatal', 'tag2']);
        expect(level).toBe('fatal');
        expect(message).toBe('test error 2');

        expect(error.message).toBe(event.data.message);
        expect(error.name).toBe(event.data.name);
        expect(error.stack).toBe(event.data.stack);
        expect(error.code).toBe(event.data.code);
        expect(error.signal).toBe(event.data.signal);
      });

      it('event data instanceof Error, no message', async () => {
        const event = {
          data: new Error(''),
        };
        const result = await createPromiseFromStreams([
          createListStream([event]),
          format
        ]);
        const { level, message, error } = JSON.parse(result);

        expect(level).toBe('error');
        expect(message).toBe('Unknown error object (no message)');

        expect(error.message).toBe(event.data.message);
        expect(error.name).toBe(event.data.name);
        expect(error.stack).toBe(event.data.stack);
        expect(error.code).toBe(event.data.code);
        expect(error.signal).toBe(event.data.signal);
      });
    });
  });

  describe('useUTC', () => {
    it('logs in UTC when useUTC is true', async () => {
      const format = new KbnLoggerJsonFormat({
        useUTC: true
      });

      const result = await createPromiseFromStreams([
        createListStream([makeEvent('log')]),
        format
      ]);

      const { '@timestamp': timestamp } = JSON.parse(result);
      expect(timestamp).toBe(moment.utc(time).format());
    });

    it('logs in local timezone when useUTC is false', async () => {
      const format = new KbnLoggerJsonFormat({
        useUTC: false
      });

      const result = await createPromiseFromStreams([
        createListStream([makeEvent('log')]),
        format
      ]);

      const { '@timestamp': timestamp } = JSON.parse(result);
      expect(timestamp).toBe(moment(time).format());
    });
  });
});
