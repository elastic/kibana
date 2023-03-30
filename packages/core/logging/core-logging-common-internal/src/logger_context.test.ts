/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getLoggerContext, getParentLoggerContext } from './logger_context';

describe('getLoggerContext', () => {
  it('returns correct joined context name.', () => {
    expect(getLoggerContext(['a', 'b', 'c'])).toEqual('a.b.c');
    expect(getLoggerContext(['a', 'b'])).toEqual('a.b');
    expect(getLoggerContext(['a'])).toEqual('a');
    expect(getLoggerContext([])).toEqual('root');
  });
});

describe('getParentLoggerContext', () => {
  it('returns correct parent context name.', () => {
    expect(getParentLoggerContext('a.b.c')).toEqual('a.b');
    expect(getParentLoggerContext('a.b')).toEqual('a');
    expect(getParentLoggerContext('a')).toEqual('root');
  });
});
