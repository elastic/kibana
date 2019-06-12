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

import expect from '@kbn/expect';
import getUrl from '../get_url';

describe('getUrl', function () {
  it('should convert to a url', function () {
    const url = getUrl({
      protocol: 'http',
      hostname: 'localhost',
    }, {
      pathname: 'foo'
    });

    expect(url).to.be('http://localhost/foo');
  });

  it('should convert to a url with port', function () {
    const url = getUrl({
      protocol: 'http',
      hostname: 'localhost',
      port: 9220
    }, {
      pathname: 'foo'
    });

    expect(url).to.be('http://localhost:9220/foo');
  });

  it('should convert to a secure hashed url', function () {
    expect(getUrl({
      protocol: 'https',
      hostname: 'localhost',
    }, {
      pathname: 'foo',
      hash: 'bar'
    })).to.be('https://localhost/foo#bar');
  });
});
