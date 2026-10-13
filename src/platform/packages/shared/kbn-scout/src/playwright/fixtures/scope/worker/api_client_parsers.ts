/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type supertest from 'supertest';

export type ResponseParser = (
  res: supertest.Response,
  callback: (err: Error | null, body: unknown) => void
) => void;

/**
 * Superagent parser that collects the response stream into a UTF-8 string exposed as `res.body`.
 */
export const parseTextResponse: ResponseParser = (res, callback) => {
  let text = '';

  res.setEncoding('utf8');
  res.on('data', (chunk: string) => {
    text += chunk;
  });
  res.on('end', () => {
    callback(null, text);
  });
};

/**
 * Superagent parser that collects the response stream into a single Buffer exposed as `res.body`.
 */
export const parseBufferResponse: ResponseParser = (res, callback) => {
  const chunks: Buffer[] = [];

  res.on('data', (chunk: Buffer) => {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  });
  res.on('end', () => {
    callback(null, Buffer.concat(chunks));
  });
};
