/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { formatError, formatStack } from './utils';

class StubEsError<T> extends Error {
  constructor(public resp: T) {
    super('This is an elasticsearch error');
    Error.captureStackTrace(this, StubEsError);
  }
}

describe('formatError', () => {
  it('should prepend the `source` to the message', () => {
    expect(formatError('error message', 'unit_test')).toBe('unit_test: error message');
  });

  it('should handle a simple string', () => {
    expect(formatError('error message')).toBe('error message');
  });

  it('should read the root cause reason from elasticsearch errors', () => {
    const err = new StubEsError({
      error: {
        root_cause: [
          {
            reason: 'I am the detailed message',
          },
        ],
      },
    });

    expect(formatError(err, 'foo')).toBe('foo: I am the detailed message');
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

    expect(formatError(err)).toBe('I am the detailed message 1\nI am the detailed message 2');
  });
});

describe('formatStack', () => {
  it('should read the stack from an Error object', () => {
    const err = new Error('error message');
    expect(formatStack(err)).toContain(__filename);
  });

  it('should prepend the stack with the error message if it is not already there', () => {
    const error = new Error('Foo');
    error.stack = 'bar.js:1:1\nbaz.js:2:1\n';

    expect(formatStack(error)).toBe('Error: Foo\nbar.js:1:1\nbaz.js:2:1\n');
  });

  it('should just return the stack if it already includes the message', () => {
    const error = new Error('Foo');
    error.stack = 'Foo\n  bar.js:1:1\n  baz.js:2:1\n';

    expect(formatStack(error)).toBe('Foo\n  bar.js:1:1\n  baz.js:2:1\n');
  });
});
