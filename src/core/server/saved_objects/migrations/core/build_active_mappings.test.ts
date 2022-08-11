/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IndexMapping, SavedObjectsTypeMappingDefinitions } from '../../mappings';
import { buildActiveMappings, diffMappings } from './build_active_mappings';

describe('buildActiveMappings', () => {
  test('creates a strict mapping', () => {
    const mappings = buildActiveMappings({});
    expect(mappings.dynamic).toEqual('strict');
  });

  test('combines all mappings and includes core mappings', () => {
    const properties = {
      aaa: { type: 'text' },
      bbb: { type: 'long' },
    } as const;

    expect(buildActiveMappings(properties)).toMatchSnapshot();
  });

  test('disallows duplicate mappings', () => {
    const properties = { type: { type: 'long' } } as const;

    expect(() => buildActiveMappings(properties)).toThrow(/Cannot redefine core mapping \"type\"/);
  });

  test('disallows mappings with leading underscore', () => {
    const properties = { _hm: { type: 'keyword' } } as const;

    expect(() => buildActiveMappings(properties)).toThrow(
      /Invalid mapping \"_hm\"\. Mappings cannot start with _/
    );
  });

  test('handles the `dynamic` property of types', () => {
    const typeMappings: SavedObjectsTypeMappingDefinitions = {
      firstType: {
        dynamic: 'strict',
        properties: { field: { type: 'keyword' } },
      },
      secondType: {
        dynamic: false,
        properties: { field: { type: 'long' } },
      },
      thirdType: {
        properties: { field: { type: 'text' } },
      },
    };
    expect(buildActiveMappings(typeMappings)).toMatchSnapshot();
  });

  test('generated hashes are stable', () => {
    const properties = {
      aaa: { type: 'keyword', fields: { a: { type: 'keyword' }, b: { type: 'text' } } },
      bbb: { fields: { b: { type: 'text' }, a: { type: 'keyword' } }, type: 'keyword' },
      ccc: { fields: { b: { type: 'text' }, a: { type: 'text' } }, type: 'keyword' },
    } as const;

    const mappings = buildActiveMappings(properties);
    const hashes = mappings._meta!.migrationMappingPropertyHashes!;

    expect(hashes.aaa).toBeDefined();
    expect(hashes.aaa).toEqual(hashes.bbb);
    expect(hashes.aaa).not.toEqual(hashes.ccc);
  });
});

describe('diffMappings', () => {
  test('is different if expected contains extra hashes', () => {
    const actual: IndexMapping = {
      _meta: {
        migrationMappingPropertyHashes: { foo: 'bar' },
      },
      dynamic: 'strict',
      properties: {},
    };
    const expected: IndexMapping = {
      _meta: {
        migrationMappingPropertyHashes: { foo: 'bar', baz: 'qux' },
      },
      dynamic: 'strict',
      properties: {},
    };

    expect(diffMappings(actual, expected)!.changedProp).toEqual('properties.baz');
  });

  test('does nothing if actual contains extra hashes', () => {
    const actual: IndexMapping = {
      _meta: {
        migrationMappingPropertyHashes: { foo: 'bar', baz: 'qux' },
      },
      dynamic: 'strict',
      properties: {},
    };
    const expected: IndexMapping = {
      _meta: {
        migrationMappingPropertyHashes: { foo: 'bar' },
      },
      dynamic: 'strict',
      properties: {},
    };

    expect(diffMappings(actual, expected)).toBeUndefined();
  });

  test('does nothing if actual hashes are identical to expected, but properties differ', () => {
    const actual: IndexMapping = {
      _meta: {
        migrationMappingPropertyHashes: { foo: 'bar' },
      },
      dynamic: 'strict',
      properties: {
        foo: { type: 'keyword' },
      },
    };
    const expected: IndexMapping = {
      _meta: {
        migrationMappingPropertyHashes: { foo: 'bar' },
      },
      dynamic: 'strict',
      properties: {
        foo: { type: 'text' },
      },
    };

    expect(diffMappings(actual, expected)).toBeUndefined();
  });

  test('is different if meta hashes change', () => {
    const actual: IndexMapping = {
      _meta: {
        migrationMappingPropertyHashes: { foo: 'bar' },
      },
      dynamic: 'strict',
      properties: {},
    };
    const expected: IndexMapping = {
      _meta: {
        migrationMappingPropertyHashes: { foo: 'baz' },
      },
      dynamic: 'strict',
      properties: {},
    };

    expect(diffMappings(actual, expected)!.changedProp).toEqual('properties.foo');
  });

  test('is different if dynamic is different', () => {
    const actual: IndexMapping = {
      _meta: {
        migrationMappingPropertyHashes: { foo: 'bar' },
      },
      dynamic: 'strict',
      properties: {},
    };
    const expected: IndexMapping = {
      _meta: {
        migrationMappingPropertyHashes: { foo: 'bar' },
      },
      // @ts-expect-error
      dynamic: 'abcde',
      properties: {},
    };

    expect(diffMappings(actual, expected)!.changedProp).toEqual('dynamic');
  });

  test('is different if migrationMappingPropertyHashes is missing from actual', () => {
    const actual: IndexMapping = {
      _meta: {},
      dynamic: 'strict',
      properties: {},
    };
    const expected: IndexMapping = {
      _meta: {
        migrationMappingPropertyHashes: { foo: 'bar' },
      },
      dynamic: 'strict',
      properties: {},
    };

    expect(diffMappings(actual, expected)!.changedProp).toEqual('_meta');
  });

  test('is different if _meta is missing from actual', () => {
    const actual: IndexMapping = {
      dynamic: 'strict',
      properties: {},
    };
    const expected: IndexMapping = {
      _meta: {
        migrationMappingPropertyHashes: { foo: 'bar' },
      },
      dynamic: 'strict',
      properties: {},
    };

    expect(diffMappings(actual, expected)!.changedProp).toEqual('_meta');
  });
});
