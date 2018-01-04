import moment from 'moment';
import expect from 'expect.js';

import {
  createListStream,
  createPromiseFromStreams,
} from '../../../utils';

import KbnLoggerJsonFormat from '../log_format_json';

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

      expect(type).to.be('log');
      expect(message).to.be('undefined');
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

      expect(type).to.be('response');
      expect(method).to.be('GET');
      expect(statusCode).to.be(200);
      expect(message).to.be('GET /path/to/resource 200 12000ms - 13.0B');
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

      expect(type).to.be('ops');
      expect(message).to.be('memory: 0.0B uptime: 0:00:00 load: [1.00 1.00 2.00] delay: 0.000');
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

        expect(level).to.be('error');
        expect(message).to.be('test error 0');
        expect(error).to.eql({ message: 'test error 0' });
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

        expect(level).to.be('error');
        expect(message).to.be('Unknown error (no message)');
        expect(error).to.eql({});
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

        expect(level).to.be('error');
        expect(message).to.be('test error 2');

        expect(error.message).to.be(event.data.message);
        expect(error.name).to.be(event.data.name);
        expect(error.stack).to.be(event.data.stack);
        expect(error.code).to.be(event.data.code);
        expect(error.signal).to.be(event.data.signal);
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

        expect(tags).to.eql(['fatal', 'tag2']);
        expect(level).to.be('fatal');
        expect(message).to.be('test error 2');

        expect(error.message).to.be(event.data.message);
        expect(error.name).to.be(event.data.name);
        expect(error.stack).to.be(event.data.stack);
        expect(error.code).to.be(event.data.code);
        expect(error.signal).to.be(event.data.signal);
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

        expect(level).to.be('error');
        expect(message).to.be('Unknown error object (no message)');

        expect(error.message).to.be(event.data.message);
        expect(error.name).to.be(event.data.name);
        expect(error.stack).to.be(event.data.stack);
        expect(error.code).to.be(event.data.code);
        expect(error.signal).to.be(event.data.signal);
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
      expect(timestamp).to.be(moment.utc(time).format());
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
      expect(timestamp).to.be(moment(time).format());
    });
  });
});
