/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getRootFields, includedFields } from './included_fields';

describe('getRootFields', () => {
  it('returns copy of root fields', () => {
    const fields = getRootFields();
    expect(fields).toMatchInlineSnapshot(`
      Array [
        "namespace",
        "namespaces",
        "type",
        "references",
        "migrationVersion",
        "coreMigrationVersion",
        "updated_at",
        "originId",
      ]
    `);
  });
});

describe('includedFields', () => {
  const rootFields = getRootFields();

  it('returns undefined if fields are not provided', () => {
    expect(includedFields()).toBe(undefined);
  });

  it('accepts type and field as string', () => {
    const fields = includedFields('config', 'foo');
    expect(fields).toEqual(['config.foo', ...rootFields, 'foo']);
  });

  it('accepts type as array and field as string', () => {
    const fields = includedFields(['config', 'secret'], 'foo');
    expect(fields).toEqual(['config.foo', 'secret.foo', ...rootFields, 'foo']);
  });

  it('accepts type as string and field as array', () => {
    const fields = includedFields('config', ['foo', 'bar']);
    expect(fields).toEqual(['config.foo', 'config.bar', ...rootFields, 'foo', 'bar']);
  });

  it('accepts type as array and field as array', () => {
    const fields = includedFields(['config', 'secret'], ['foo', 'bar']);
    expect(fields).toEqual([
      'config.foo',
      'config.bar',
      'secret.foo',
      'secret.bar',
      ...rootFields,
      'foo',
      'bar',
    ]);
  });

  it('uses wildcard when type is not provided', () => {
    const fields = includedFields(undefined, 'foo');
    expect(fields).toEqual(['*.foo', ...rootFields, 'foo']);
  });
});
