/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { stripIllegalHttp2Headers } from './strip_illegal_http2_headers';
import { loggerMock, MockedLogger } from '@kbn/logging-mocks';

describe('stripIllegalHttp2Headers', () => {
  let logger: MockedLogger;

  beforeEach(() => {
    logger = loggerMock.create();
  });

  it('removes illegal http2 headers', () => {
    const headers = {
      'x-foo': 'bar',
      'x-hello': 'dolly',
      connection: 'keep-alive',
      'proxy-connection': 'keep-alive',
      'keep-alive': 'true',
      upgrade: 'probably',
      'transfer-encoding': 'chunked',
      'http2-settings': 'yeah',
    };
    const output = stripIllegalHttp2Headers({
      headers,
      isDev: false,
      logger,
      requestContext: 'requestContext',
    });

    expect(output).toEqual({
      'x-foo': 'bar',
      'x-hello': 'dolly',
    });
  });

  it('ignores case when detecting headers', () => {
    const headers = {
      'x-foo': 'bar',
      'x-hello': 'dolly',
      Connection: 'keep-alive',
      'Proxy-Connection': 'keep-alive',
      'kEeP-AlIvE': 'true',
    };
    const output = stripIllegalHttp2Headers({
      headers,
      isDev: false,
      logger,
      requestContext: 'requestContext',
    });

    expect(output).toEqual({
      'x-foo': 'bar',
      'x-hello': 'dolly',
    });
  });

  it('logs a warning about the illegal header when in dev mode', () => {
    const headers = {
      'x-foo': 'bar',
      Connection: 'keep-alive',
    };
    stripIllegalHttp2Headers({
      headers,
      isDev: true,
      logger,
      requestContext: 'requestContext',
    });

    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      `Handler for "requestContext" returned an illegal http2 header: Connection. Please check "request.protocol" in handlers before assigning connection headers`
    );
  });

  it('does not log a warning about the illegal header when not in dev mode', () => {
    const headers = {
      'x-foo': 'bar',
      Connection: 'keep-alive',
    };
    stripIllegalHttp2Headers({
      headers,
      isDev: false,
      logger,
      requestContext: 'requestContext',
    });

    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('does not mutate the original headers', () => {
    const headers = {
      'x-foo': 'bar',
      Connection: 'keep-alive',
    };
    stripIllegalHttp2Headers({
      headers,
      isDev: true,
      logger,
      requestContext: 'requestContext',
    });

    expect(headers).toEqual({
      'x-foo': 'bar',
      Connection: 'keep-alive',
    });
  });
});
