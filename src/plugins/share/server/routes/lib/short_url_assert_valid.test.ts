/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { shortUrlAssertValid } from './short_url_assert_valid';

describe('shortUrlAssertValid()', () => {
  const invalid = [
    ['protocol', 'http://localhost:5601/app/kibana'],
    ['protocol', 'https://localhost:5601/app/kibana'],
    ['protocol', 'mailto:foo@bar.net'],
    ['protocol', 'javascript:alert("hi")'], // eslint-disable-line no-script-url
    ['hostname', 'localhost/app/kibana'],
    ['hostname and port', 'local.host:5601/app/kibana'],
    ['hostname and auth', 'user:pass@localhost.net/app/kibana'],
    ['path traversal', '/app/../../not-kibana'],
    ['deep path', '/app/kibana/foo'],
    ['deep path', '/app/kibana/foo/bar'],
    ['base path', '/base/app/kibana'],
  ];

  invalid.forEach(([desc, url]) => {
    it(`fails when url has ${desc}`, () => {
      try {
        shortUrlAssertValid(url);
        throw new Error(`expected assertion to throw`);
      } catch (err) {
        if (!err || !err.isBoom) {
          throw err;
        }
      }
    });
  });

  const valid = [
    '/app/kibana',
    '/app/monitoring#angular/route',
    '/app/text#document-id',
    '/app/some?with=query',
    '/app/some?with=query#and-a-hash',
  ];

  valid.forEach(url => {
    it(`allows ${url}`, () => {
      shortUrlAssertValid(url);
    });
  });
});
