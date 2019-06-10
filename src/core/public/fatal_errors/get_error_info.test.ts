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

import { getErrorInfo } from './get_error_info';

class StubEsError<T> extends Error {
  constructor(public resp: T) {
    super('This is an elasticsearch error');
    Error.captureStackTrace(this, StubEsError);
  }
}

it('should prepend the `source` to the message', () => {
  expect(getErrorInfo('error message', 'unit_test')).toEqual({
    message: 'unit_test: error message',
  });
});

it('should handle a simple string', () => {
  expect(getErrorInfo('error message')).toEqual({
    message: 'error message',
  });
});

it('reads the message and stack from an Error object', () => {
  const err = new Error('error message');
  expect(getErrorInfo(err)).toEqual({
    message: 'error message',
    stack: expect.stringContaining(__filename),
  });
});

it('reads the root cause reason from elasticsearch errors', () => {
  const err = new StubEsError({
    error: {
      root_cause: [
        {
          reason: 'I am the detailed message',
        },
      ],
    },
  });

  expect(getErrorInfo(err, 'foo')).toEqual({
    message: 'foo: I am the detailed message',
    stack: expect.stringContaining(__filename),
  });
});

it('should combine the root cause reasons if elasticsearch error has more than one', () => {
  const err = new StubEsError({
    error: {
      root_cause: [
        {
          reason: 'I am the detailed message 1',
        },
        {
          reason: 'I am the detailed message 2',
        },
      ],
    },
  });

  expect(getErrorInfo(err)).toEqual({
    message: 'I am the detailed message 1\nI am the detailed message 2',
    stack: expect.stringContaining(__filename),
  });
});

it('should prepend the stack with the error message if it is not already there', () => {
  const error = new Error('Foo');
  error.stack = 'bar.js:1:1\nbaz.js:2:1\n';

  expect(getErrorInfo(error)).toEqual({
    message: 'Foo',
    stack: 'Error: Foo\nbar.js:1:1\nbaz.js:2:1\n',
  });
});

it('should just return the stack if it already includes the message', () => {
  const error = new Error('Foo');
  error.stack = 'Foo\n  bar.js:1:1\n  baz.js:2:1\n';

  expect(getErrorInfo(error)).toEqual({
    message: 'Foo',
    stack: 'Foo\n  bar.js:1:1\n  baz.js:2:1\n',
  });
});
