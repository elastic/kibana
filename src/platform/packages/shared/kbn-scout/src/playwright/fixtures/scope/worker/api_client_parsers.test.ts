/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PassThrough } from 'stream';
import type supertest from 'supertest';
import { parseBufferResponse, parseTextResponse } from './api_client_parsers';
import type { ResponseParser } from './api_client_parsers';

describe('api_client_parsers', () => {
  describe('parseTextResponse', () => {
    it('concatenates streamed chunks into a string without parsing them as JSON', async () => {
      const ndjson = '{"id":"rule-1"}\n{"id":"rule-2"}\n{"exported_count":2}\n';

      const body = await parse(parseTextResponse, [
        Buffer.from(ndjson.slice(0, 10)),
        Buffer.from(ndjson.slice(10)),
      ]);

      expect(body).toBe(ndjson);
    });

    it('decodes a multi-byte UTF-8 character split across chunks', async () => {
      const utf8 = Buffer.from('é');

      const body = await parse(parseTextResponse, [utf8.subarray(0, 1), utf8.subarray(1)]);

      expect(body).toBe('é');
    });
  });

  describe('parseBufferResponse', () => {
    it('concatenates streamed chunks into a single Buffer', async () => {
      const body = await parse(parseBufferResponse, [
        Buffer.from([0x01, 0x02]),
        Buffer.from([0x03]),
      ]);

      expect(Buffer.isBuffer(body)).toBe(true);
      expect(body).toEqual(Buffer.from([0x01, 0x02, 0x03]));
    });
  });
});

const parse = (parser: ResponseParser, chunks: Buffer[]): Promise<unknown> =>
  new Promise((resolve, reject) => {
    const stream = new PassThrough();

    parser(stream as unknown as supertest.Response, (err, body) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(body);
    });

    for (const chunk of chunks) {
      stream.write(chunk);
    }

    stream.end();
  });
