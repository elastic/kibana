/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { shortUrlAssertValid } from './short_url_assert_valid';

const PROTOCOL_ERROR = /^Short url targets cannot have a protocol/;
const HOSTNAME_ERROR = /^Short url targets cannot have a hostname/;
const PATH_ERROR = /^Short url target path must be in the format/;

describe('shortUrlAssertValid()', () => {
  const invalid = [
    ['protocol', 'http://localhost:5601/app/kibana', PROTOCOL_ERROR],
    ['protocol', 'https://localhost:5601/app/kibana', PROTOCOL_ERROR],
    ['protocol', 'mailto:foo@bar.net', PROTOCOL_ERROR],
    ['protocol', 'javascript:alert("hi")', PROTOCOL_ERROR], // eslint-disable-line no-script-url
    ['hostname', 'localhost/app/kibana', PATH_ERROR], // according to spec, this is not a valid URL -- you cannot specify a hostname without a protocol
    ['hostname and port', 'local.host:5601/app/kibana', PROTOCOL_ERROR], // parser detects 'local.host' as the protocol
    ['hostname and auth', 'user:pass@localhost.net/app/kibana', PROTOCOL_ERROR], // parser detects 'user' as the protocol
    ['path traversal', '/app/../../not-kibana', PATH_ERROR], // fails because there are >2 path parts
    ['path traversal', '/../not-kibana', PATH_ERROR], // fails because first path part is not 'app'
    ['deep path', '/app/kibana/foo', PATH_ERROR], // fails because there are >2 path parts
    ['deeper path', '/app/kibana/foo/bar', PATH_ERROR], // fails because there are >2 path parts
    ['base path', '/base/app/kibana', PATH_ERROR], // fails because there are >2 path parts
    ['path with an extra leading slash', '//foo/app/kibana', HOSTNAME_ERROR], // parser detects 'foo' as the hostname
    ['path with an extra leading slash', '///app/kibana', HOSTNAME_ERROR], // parser detects '' as the hostname
    ['path without app', '/foo/kibana', PATH_ERROR], // fails because first path part is not 'app'
    ['path without appId', '/app/', PATH_ERROR], // fails because there is only one path part (leading and trailing slashes are trimmed)
  ];

  invalid.forEach(([desc, url, error]) => {
    it(`fails when url has ${desc as string}`, () => {
      expect(() => shortUrlAssertValid(url as string)).toThrowError(error);
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
