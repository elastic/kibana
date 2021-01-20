/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { includedFields } from './included_fields';

const BASE_FIELD_COUNT = 9;

describe('includedFields', () => {
  it('returns undefined if fields are not provided', () => {
    expect(includedFields()).toBe(undefined);
  });

  it('accepts type string', () => {
    const fields = includedFields('config', 'foo');
    expect(fields).toHaveLength(BASE_FIELD_COUNT);
    expect(fields).toContain('type');
  });

  it('accepts type as string array', () => {
    const fields = includedFields(['config', 'secret'], 'foo');
    expect(fields).toMatchInlineSnapshot(`
Array [
  "config.foo",
  "secret.foo",
  "namespace",
  "namespaces",
  "type",
  "references",
  "migrationVersion",
  "updated_at",
  "originId",
  "foo",
]
`);
  });

  it('accepts field as string', () => {
    const fields = includedFields('config', 'foo');
    expect(fields).toHaveLength(BASE_FIELD_COUNT);
    expect(fields).toContain('config.foo');
  });

  it('accepts fields as an array', () => {
    const fields = includedFields('config', ['foo', 'bar']);

    expect(fields).toHaveLength(BASE_FIELD_COUNT + 2);
    expect(fields).toContain('config.foo');
    expect(fields).toContain('config.bar');
  });

  it('accepts type as string array and fields as string array', () => {
    const fields = includedFields(['config', 'secret'], ['foo', 'bar']);
    expect(fields).toMatchInlineSnapshot(`
Array [
  "config.foo",
  "config.bar",
  "secret.foo",
  "secret.bar",
  "namespace",
  "namespaces",
  "type",
  "references",
  "migrationVersion",
  "updated_at",
  "originId",
  "foo",
  "bar",
]
`);
  });

  it('includes namespace', () => {
    const fields = includedFields('config', 'foo');
    expect(fields).toHaveLength(BASE_FIELD_COUNT);
    expect(fields).toContain('namespace');
  });

  it('includes namespaces', () => {
    const fields = includedFields('config', 'foo');
    expect(fields).toHaveLength(BASE_FIELD_COUNT);
    expect(fields).toContain('namespaces');
  });

  it('includes references', () => {
    const fields = includedFields('config', 'foo');
    expect(fields).toHaveLength(BASE_FIELD_COUNT);
    expect(fields).toContain('references');
  });

  it('includes migrationVersion', () => {
    const fields = includedFields('config', 'foo');
    expect(fields).toHaveLength(BASE_FIELD_COUNT);
    expect(fields).toContain('migrationVersion');
  });

  it('includes updated_at', () => {
    const fields = includedFields('config', 'foo');
    expect(fields).toHaveLength(BASE_FIELD_COUNT);
    expect(fields).toContain('updated_at');
  });

  it('includes originId', () => {
    const fields = includedFields('config', 'foo');
    expect(fields).toHaveLength(BASE_FIELD_COUNT);
    expect(fields).toContain('originId');
  });

  it('uses wildcard when type is not provided', () => {
    const fields = includedFields(undefined, 'foo');
    expect(fields).toHaveLength(BASE_FIELD_COUNT);
    expect(fields).toContain('*.foo');
  });

  describe('v5 compatibility', () => {
    it('includes legacy field path', () => {
      const fields = includedFields('config', ['foo', 'bar']);

      expect(fields).toHaveLength(BASE_FIELD_COUNT + 2);
      expect(fields).toContain('foo');
      expect(fields).toContain('bar');
    });
  });
});
