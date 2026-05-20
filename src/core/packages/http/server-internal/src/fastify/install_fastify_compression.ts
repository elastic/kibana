/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import url from 'url';
import { constants as zlibConstants } from 'zlib';
import compress from '@fastify/compress';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Logger } from '@kbn/logging';
import type { HttpConfig } from '../http_config';

/** Mirrors typical Hapi response compression behavior (see `http_server.test.ts`). */
const COMPRESSION_THRESHOLD_BYTES = 1024;

const originalAcceptEncoding = Symbol('kibanaOriginalAcceptEncoding');

type FastifyRequestWithPreservedAcceptEncoding = FastifyRequest & {
  [originalAcceptEncoding]?: string | string[];
};

/**
 * Client `Accept-Encoding` for pre-compressed static assets. Hapi clears
 * `request.info.acceptEncoding` for brok only; Inert still negotiates `.gz`/`.br` siblings
 * from the incoming header.
 */
export function getRequestAcceptEncoding(req: FastifyRequest): string | undefined {
  const preserved = (req as FastifyRequestWithPreservedAcceptEncoding)[originalAcceptEncoding];
  const value = preserved ?? req.headers['accept-encoding'];
  return typeof value === 'string' ? value : undefined;
}

function preserveRequestAcceptEncoding(fastify: FastifyInstance): void {
  fastify.addHook('onRequest', (req, _reply, done) => {
    const acceptEncoding = req.headers['accept-encoding'];
    if (acceptEncoding != null) {
      (req as FastifyRequestWithPreservedAcceptEncoding)[originalAcceptEncoding] = acceptEncoding;
    }
    done();
  });
}

/**
 * Registers `@fastify/compress` and conditional compression hooks aligned with
 * {@link HttpServer.setupConditionalCompression} (Hapi clears `request.info.acceptEncoding`
 * for brok when disabled or when the referrer is not whitelisted).
 */
export async function installFastifyCompression(
  fastify: FastifyInstance,
  config: HttpConfig,
  log: Logger
): Promise<void> {
  preserveRequestAcceptEncoding(fastify);

  const { enabled, referrerWhitelist: list, brotli } = config.compression;

  if (!enabled) {
    log.debug('HTTP compression is disabled');
    return;
  }

  const encodings: Array<'br' | 'gzip' | 'deflate'> = ['gzip', 'deflate'];
  if (brotli.enabled) {
    encodings.unshift('br');
  }

  await fastify.register(compress, {
    global: true,
    // Kibana does not rely on @fastify/compress request decompression; the plugin's
    // callback-style route `preParsing` hook returns `undefined` under Fastify 4 and breaks
    // the global `preParsing` chain (e.g. pre-start supertest against an unsealed server).
    globalDecompression: false,
    threshold: COMPRESSION_THRESHOLD_BYTES,
    encodings,
    brotliOptions: {
      params: {
        [zlibConstants.BROTLI_PARAM_QUALITY]: brotli.quality,
      },
    },
    zlib: {
      level: zlibConstants.Z_DEFAULT_COMPRESSION,
    },
  });

  if (list) {
    log.debug(`HTTP compression is only enabled for any referrer in the following: ${list}`);
    fastify.addHook('onRequest', (req, _reply, done) => {
      const referrer = req.headers.referer ?? '';
      if (referrer !== '') {
        const { hostname } = url.parse(referrer);
        if (!hostname || !list.includes(hostname)) {
          delete req.headers['accept-encoding'];
        }
      }
      done();
    });
  }
}
