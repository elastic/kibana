/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Readable } from 'node:stream';
import type { RouterRoute } from '@kbn/core-http-server';

import { coercePayloadForUnparsedStreamRoute } from './fastify_to_hapi_request';

const streamRoute = {
  options: {
    body: {
      output: 'stream',
      parse: false,
    },
  },
} as Pick<RouterRoute, 'options'>;

describe('coercePayloadForUnparsedStreamRoute', () => {
  it('wraps Fastify text/plain string bodies in a Readable', () => {
    const payload = coercePayloadForUnparsedStreamRoute(streamRoute, 'file bytes');
    expect(payload).toBeInstanceOf(Readable);
  });

  it('wraps raw buffers in a Readable', () => {
    const buf = Buffer.from('zip');
    const payload = coercePayloadForUnparsedStreamRoute(streamRoute, buf);
    expect(payload).toBeInstanceOf(Readable);
  });

  it('leaves parsed JSON routes unchanged', () => {
    const jsonRoute = {
      options: {
        body: {
          output: 'data',
          parse: true,
        },
      },
    } as Pick<RouterRoute, 'options'>;
    expect(coercePayloadForUnparsedStreamRoute(jsonRoute, 'plain')).toBe('plain');
  });
});
