/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { splitKey, getUnsplittableKey, replaceEnvVarRefs } from './utils';

describe('splitKey', () => {
  it('correctly splits on the dot delimiter', () => {
    expect(splitKey('hello')).toEqual(['hello']);
    expect(splitKey('hello.dolly')).toEqual(['hello', 'dolly']);
    expect(splitKey('foo.bar.lala')).toEqual(['foo', 'bar', 'lala']);
  });

  it('identifies the unsplittable key pattern', () => {
    expect(splitKey('[hello]')).toEqual(['hello']);
    expect(splitKey('[foo.bar]')).toEqual(['foo.bar']);
  });
});

describe('getUnsplittableKey', () => {
  it('returns the correct key when matching', () => {
    expect(getUnsplittableKey('[hello]')).toEqual('hello');
    expect(getUnsplittableKey('[foo.bar]')).toEqual('foo.bar');
  });

  it('returns undefined when not matching', () => {
    expect(getUnsplittableKey('[foo.bar')).toEqual(undefined);
    expect(getUnsplittableKey('foo.bar]')).toEqual(undefined);
    expect(getUnsplittableKey('foo.bar')).toEqual(undefined);
  });
});

describe('replaceEnvVarRefs', () => {
  it('throws an error if the variable is not defined', () => {
    expect(() => replaceEnvVarRefs('${VAR_1}', {})).toThrowErrorMatchingInlineSnapshot(
      `"Unknown environment variable referenced in config : VAR_1"`
    );
  });
  it('replaces the environment variable with its value', () => {
    expect(replaceEnvVarRefs('${VAR_1}', { VAR_1: 'foo' })).toEqual('foo');
  });
  it('replaces the environment variable within a longer string', () => {
    expect(replaceEnvVarRefs('hello ${VAR_1} bar', { VAR_1: 'foo' })).toEqual('hello foo bar');
  });
  it('replaces multiple occurrences of the same variable', () => {
    expect(replaceEnvVarRefs('${VAR_1}-${VAR_1}', { VAR_1: 'foo' })).toEqual('foo-foo');
  });
  it('replaces multiple occurrences of different variables', () => {
    expect(replaceEnvVarRefs('${VAR_1}-${VAR_2}', { VAR_1: 'foo', VAR_2: 'bar' })).toEqual(
      'foo-bar'
    );
  });
  it('uses the default value if specified and the var is not defined', () => {
    expect(replaceEnvVarRefs('${VAR:default}', {})).toEqual('default');
  });
  it('uses the value from the var if specified even with a default value', () => {
    expect(replaceEnvVarRefs('${VAR:default}', { VAR: 'value' })).toEqual('value');
  });
  it('supports defining a default value for multiple variables', () => {
    expect(replaceEnvVarRefs('${VAR1:var}:${VAR2:var2}', {})).toEqual('var:var2');
  });
  it('only use default value for variables that are not set', () => {
    expect(replaceEnvVarRefs('${VAR1:default1}:${VAR2:default2}', { VAR2: 'var2' })).toEqual(
      'default1:var2'
    );
  });
});
