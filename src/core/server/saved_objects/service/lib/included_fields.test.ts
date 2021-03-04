/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { includedFields, ROOT_FIELDS } from './included_fields';

describe('includedFields', () => {
  it('returns undefined if fields are not provided', () => {
    expect(includedFields()).toBe(undefined);
  });

  it('accepts type and field as string', () => {
    const fields = includedFields('config', 'foo');
    expect(fields).toEqual(['config.foo', ...ROOT_FIELDS, 'foo']);
  });

  it('accepts type as array and field as string', () => {
    const fields = includedFields(['config', 'secret'], 'foo');
    expect(fields).toEqual(['config.foo', 'secret.foo', ...ROOT_FIELDS, 'foo']);
  });

  it('accepts type as string and field as array', () => {
    const fields = includedFields('config', ['foo', 'bar']);
    expect(fields).toEqual(['config.foo', 'config.bar', ...ROOT_FIELDS, 'foo', 'bar']);
  });

  it('accepts type as array and field as array', () => {
    const fields = includedFields(['config', 'secret'], ['foo', 'bar']);
    expect(fields).toEqual([
      'config.foo',
      'config.bar',
      'secret.foo',
      'secret.bar',
      ...ROOT_FIELDS,
      'foo',
      'bar',
    ]);
  });

  it('uses wildcard when type is not provided', () => {
    const fields = includedFields(undefined, 'foo');
    expect(fields).toEqual(['*.foo', ...ROOT_FIELDS, 'foo']);
  });
});
