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
import { setHeaders } from '../set_headers';

describe('#set_headers', function() {
  it('throws if not given an object as the first argument', function() {
    const fn = () => setHeaders(null, {});
    expect(fn).to.throwError();
  });

  it('throws if not given an object as the second argument', function() {
    const fn = () => setHeaders({}, null);
    expect(fn).to.throwError();
  });

  it('returns a new object', function() {
    const originalHeaders = {};
    const newHeaders = {};
    const returnedHeaders = setHeaders(originalHeaders, newHeaders);
    expect(returnedHeaders).not.to.be(originalHeaders);
    expect(returnedHeaders).not.to.be(newHeaders);
  });

  it('returns object with newHeaders merged with originalHeaders', function() {
    const originalHeaders = { foo: 'bar' };
    const newHeaders = { one: 'two' };
    const returnedHeaders = setHeaders(originalHeaders, newHeaders);
    expect(returnedHeaders).to.eql({ foo: 'bar', one: 'two' });
  });

  it('returns object where newHeaders takes precedence for any matching keys', function() {
    const originalHeaders = { foo: 'bar' };
    const newHeaders = { one: 'two', foo: 'notbar' };
    const returnedHeaders = setHeaders(originalHeaders, newHeaders);
    expect(returnedHeaders).to.eql({ foo: 'notbar', one: 'two' });
  });
});
