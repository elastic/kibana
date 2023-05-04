/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getUrl } from './get_url';

describe('getUrl', function () {
  it('should convert to a url', function () {
    const url = getUrl(
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        pathname: 'foo',
      }
    );

    expect(url).toBe('http://localhost/foo');
  });

  it('should convert to a url with port', function () {
    const url = getUrl(
      {
        protocol: 'http',
        hostname: 'localhost',
        port: 9220,
      },
      {
        pathname: 'foo',
      }
    );

    expect(url).toBe('http://localhost:9220/foo');
  });

  it('should convert to a secure hashed url', function () {
    expect(
      getUrl(
        {
          protocol: 'https',
          hostname: 'localhost',
        },
        {
          pathname: 'foo',
          hash: 'bar',
        }
      )
    ).toBe('https://localhost/foo#bar');
  });
});
