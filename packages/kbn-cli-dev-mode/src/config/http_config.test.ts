/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { KBN_CERT_PATH, KBN_KEY_PATH } from '@kbn/dev-utils';
import { httpConfigSchema } from './http_config';

describe('development proxy HTTP configuration', () => {
  const ssl = { enabled: true, certificate: KBN_CERT_PATH, key: KBN_KEY_PATH };

  it('defaults to HTTP/2 when TLS is enabled', () => {
    expect(httpConfigSchema.validate({ ssl }).protocol).toBe('http2');
  });

  it('defaults to HTTP/1 when TLS is disabled', () => {
    expect(httpConfigSchema.validate({ ssl: { enabled: false } }).protocol).toBe('http1');
  });

  it('defaults to HTTP/1 when TLS is not configured', () => {
    expect(httpConfigSchema.validate({}).protocol).toBe('http1');
  });

  it.each(['http1', 'http2'] as const)('honors an explicit %s protocol', (protocol) => {
    expect(httpConfigSchema.validate({ ssl, protocol }).protocol).toBe(protocol);
  });
});
