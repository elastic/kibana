/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { shortUrlAssertValid } from './short_url_assert_valid';

describe('shortUrlAssertValid()', () => {
  const invalid = [
    ['protocol', 'http://localhost:5601/app/kibana'],
    ['protocol', 'https://localhost:5601/app/kibana'],
    ['protocol', 'mailto:foo@bar.net'],
    ['protocol', 'javascript:alert("hi")'], // eslint-disable-line no-script-url
    ['hostname', 'localhost/app/kibana'], // according to spec, this is not a valid URL -- you cannot specify a hostname without a protocol
    ['hostname and port', 'local.host:5601/app/kibana'], // parser detects 'local.host' as the protocol
    ['hostname and auth', 'user:pass@localhost.net/app/kibana'], // parser detects 'user' as the protocol
    ['path traversal', '/app/../../not-kibana'], // fails because there are >2 path parts
    ['path traversal', '/../not-kibana'], // fails because first path part is not 'app'
    ['base path', '/base/app/kibana'], // fails because there are >2 path parts
    ['path with an extra leading slash', '//foo/app/kibana'], // parser detects 'foo' as the hostname
    ['path with an extra leading slash', '///app/kibana'], // parser detects '' as the hostname
    ['path without app', '/foo/kibana'], // fails because first path part is not 'app'
    ['path without appId', '/app/'], // fails because there is only one path part (leading and trailing slashes are trimmed)
  ];

  invalid.forEach(([desc, url, error]) => {
    it(`fails when url has ${desc as string}`, () => {
      expect(() => shortUrlAssertValid(url as string)).toThrow();
    });
  });

  const valid = [
    '/app/kibana',
    '/app/kibana/', // leading and trailing slashes are trimmed
    '/app/monitoring#angular/route',
    '/app/text#document-id',
    '/app/some?with=query',
    '/app/some?with=query#and-a-hash',
  ];

  valid.forEach((url) => {
    it(`allows ${url}`, () => {
      shortUrlAssertValid(url);
    });
  });
});
