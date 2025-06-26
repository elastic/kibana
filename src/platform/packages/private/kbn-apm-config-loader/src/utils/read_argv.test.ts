/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getArgValue, getArgValues } from './read_argv';

describe('getArgValues', () => {
  it('retrieve the arg value from the provided argv arguments', () => {
    const argValues = getArgValues(
      ['--config', 'my-config', '--foo', '-b', 'bar', '--config', 'other-config', '--baz'],
      '--config'
    );
    expect(argValues).toEqual(['my-config', 'other-config']);
  });

  it('accept aliases', () => {
    const argValues = getArgValues(
      ['--config', 'my-config', '--foo', '-b', 'bar', '-c', 'other-config', '--baz'],
      ['--config', '-c']
    );
    expect(argValues).toEqual(['my-config', 'other-config']);
  });

  it('returns an empty array when the arg is not found', () => {
    const argValues = getArgValues(
      ['--config', 'my-config', '--foo', '-b', 'bar', '-c', 'other-config', '--baz'],
      '--unicorn'
    );
    expect(argValues).toEqual([]);
  });

  it('ignores the flag when no value is provided', () => {
    const argValues = getArgValues(
      ['-c', 'my-config', '--foo', '-b', 'bar', '--config'],
      ['--config', '-c']
    );
    expect(argValues).toEqual(['my-config']);
  });
});

describe('getArgValue', () => {
  it('retrieve the first arg value from the provided argv arguments', () => {
    const argValues = getArgValue(
      ['--config', 'my-config', '--foo', '-b', 'bar', '--config', 'other-config', '--baz'],
      '--config'
    );
    expect(argValues).toEqual('my-config');
  });

  it('accept aliases', () => {
    const argValues = getArgValue(
      ['-c', 'my-config', '--foo', '-b', 'bar', '--config', 'other-config', '--baz'],
      ['--config', '-c']
    );
    expect(argValues).toEqual('my-config');
  });

  it('returns undefined the arg is not found', () => {
    const argValues = getArgValue(
      ['--config', 'my-config', '--foo', '-b', 'bar', '-c', 'other-config', '--baz'],
      '--unicorn'
    );
    expect(argValues).toBeUndefined();
  });
});
