/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Request } from '@hapi/hapi';
import Boom from '@hapi/boom';

import mockFs from 'mock-fs';
import { createReadStream } from 'fs';
import { PassThrough } from 'stream';
import { createGunzip, createGzip } from 'zlib';

import { loggerMock, MockedLogger } from '@kbn/logging-mocks';

import { getResponsePayloadBytes } from './get_payload_size';

type Response = Request['response'];

describe('getPayloadSize', () => {
  let logger: MockedLogger;

  beforeEach(() => (logger = loggerMock.create()));

  test('handles Boom errors', () => {
    const boomError = Boom.badRequest();
    const payload = boomError.output.payload;
    const result = getResponsePayloadBytes(boomError, logger);
    expect(result).toBe(JSON.stringify(payload).length);
  });

  describe('handles Buffers', () => {
    test('with ascii characters', () => {
      const result = getResponsePayloadBytes(
        {
          variety: 'buffer',
          source: Buffer.from('heya'),
        } as Response,
        logger
      );
      expect(result).toBe(4);
    });

    test('with special characters', () => {
      const result = getResponsePayloadBytes(
        {
          variety: 'buffer',
          source: Buffer.from('¡hola!'),
        } as Response,
        logger
      );
      expect(result).toBe(7);
    });
  });

  describe('handles streams', () => {
    afterEach(() => mockFs.restore());

    test('ignores streams that are not fs or zlib streams', async () => {
      const result = getResponsePayloadBytes(
        {
          variety: 'stream',
          source: new PassThrough(),
        } as Response,
        logger
      );

      expect(result).toBe(undefined);
    });

    describe('fs streams', () => {
      test('with ascii characters', async () => {
        mockFs({ 'test.txt': 'heya' });
        const source = createReadStream('test.txt');

        let data = '';
        for await (const chunk of source) {
          data += chunk;
        }

        const result = getResponsePayloadBytes(
          {
            variety: 'stream',
            source,
          } as Response,
          logger
        );

        expect(result).toBe(Buffer.byteLength(data));
      });

      test('with special characters', async () => {
        mockFs({ 'test.txt': '¡hola!' });
        const source = createReadStream('test.txt');

        let data = '';
        for await (const chunk of source) {
          data += chunk;
        }

        const result = getResponsePayloadBytes(
          {
            variety: 'stream',
            source,
          } as Response,
          logger
        );

        expect(result).toBe(Buffer.byteLength(data));
      });
    });

    describe('zlib streams', () => {
      test('with ascii characters', async () => {
        mockFs({ 'test.txt': 'heya' });
        const readStream = createReadStream('test.txt');
        const source = readStream.pipe(createGzip()).pipe(createGunzip());

        let data = '';
        for await (const chunk of source) {
          data += chunk;
        }

        const result = getResponsePayloadBytes(
          {
            variety: 'stream',
            source,
          } as Response,
          logger
        );

        expect(data).toBe('heya');
        expect(result).toBe(source.bytesWritten);
      });

      test('with special characters', async () => {
        mockFs({ 'test.txt': '¡hola!' });
        const readStream = createReadStream('test.txt');
        const source = readStream.pipe(createGzip()).pipe(createGunzip());

        let data = '';
        for await (const chunk of source) {
          data += chunk;
        }

        const result = getResponsePayloadBytes(
          {
            variety: 'stream',
            source,
          } as Response,
          logger
        );

        expect(data).toBe('¡hola!');
        expect(result).toBe(source.bytesWritten);
      });
    });
  });

  describe('handles plain responses', () => {
    test('when source is text', () => {
      const result = getResponsePayloadBytes(
        {
          variety: 'plain',
          source: 'heya',
        } as Response,
        logger
      );
      expect(result).toBe(4);
    });

    test('when source has special characters', () => {
      const result = getResponsePayloadBytes(
        {
          variety: 'plain',
          source: '¡hola!',
        } as Response,
        logger
      );
      expect(result).toBe(7);
    });

    test('when source is plain object', () => {
      const payload = { message: 'heya' };
      const result = getResponsePayloadBytes(
        {
          variety: 'plain',
          source: payload,
        } as Response,
        logger
      );
      expect(result).toBe(JSON.stringify(payload).length);
    });

    test('when source is array object', () => {
      const payload = [{ message: 'hey' }, { message: 'ya' }];
      const result = getResponsePayloadBytes(
        {
          variety: 'plain',
          source: payload,
        } as Response,
        logger
      );
      expect(result).toBe(JSON.stringify(payload).length);
    });

    test('returns undefined when source is not a plain object', () => {
      class TestClass {
        constructor() {}
      }
      const result = getResponsePayloadBytes(
        {
          variety: 'plain',
          source: new TestClass(),
        } as Response,
        logger
      );
      expect(result).toBe(undefined);
    });
  });

  describe('handles content-length header', () => {
    test('always provides content-length header if available', () => {
      const headers = { 'content-length': '123' };
      const result = getResponsePayloadBytes(
        {
          headers,
          variety: 'plain',
          source: 'abc',
        } as unknown as Response,
        logger
      );
      expect(result).toBe(123);
    });

    test('uses first value when hapi header is an array', () => {
      const headers = { 'content-length': ['123', '456'] };
      const result = getResponsePayloadBytes({ headers } as unknown as Response, logger);
      expect(result).toBe(123);
    });

    test('returns undefined if length is NaN', () => {
      const headers = { 'content-length': 'oops' };
      const result = getResponsePayloadBytes({ headers } as unknown as Response, logger);
      expect(result).toBeUndefined();
    });
  });

  test('defaults to undefined', () => {
    const result = getResponsePayloadBytes({} as unknown as Response, logger);
    expect(result).toBeUndefined();
  });

  test('swallows errors to prevent crashing Kibana', () => {
    // intentionally create a circular reference so JSON.stringify fails
    const payload = {
      get circular() {
        return this;
      },
    };
    const result = getResponsePayloadBytes(
      {
        variety: 'plain',
        source: payload.circular,
      } as unknown as Response,
      logger
    );
    expect(result).toBeUndefined();
  });

  test('logs any errors that are caught', () => {
    // intentionally create a circular reference so JSON.stringify fails
    const payload = {
      get circular() {
        return this;
      },
    };
    getResponsePayloadBytes(
      {
        variety: 'plain',
        source: payload.circular,
      } as unknown as Response,
      logger
    );
    expect(logger.warn.mock.calls[0][0]).toMatchInlineSnapshot(
      `"Failed to calculate response payload bytes."`
    );
  });
});
