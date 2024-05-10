/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  IndexMappingMeta,
  SavedObjectsTypeMappingDefinitions,
} from '@kbn/core-saved-objects-base-server-internal';
import { buildActiveMappings, getBaseMappings } from './build_active_mappings';

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

  test(`includes the provided override properties, except for 'properties'`, () => {
    const properties = {
      aaa: { type: 'keyword', fields: { a: { type: 'keyword' }, b: { type: 'text' } } },
      bbb: { fields: { b: { type: 'text' }, a: { type: 'keyword' } }, type: 'keyword' },
      ccc: { fields: { b: { type: 'text' }, a: { type: 'text' } }, type: 'keyword' },
    } as const;

    const ourExternallyBuiltMeta: IndexMappingMeta = {
      mappingVersions: {
        foo: '10.1.0',
        bar: '10.2.0',
        baz: '10.3.0',
      },
    };

    const mappings = buildActiveMappings(properties, ourExternallyBuiltMeta);
    expect(mappings._meta).toEqual(ourExternallyBuiltMeta);
    expect(mappings.properties.ddd).toBeUndefined();
  });
});

describe('getBaseMappings', () => {
  test('changes in core fields trigger a pickup of all documents, which can be really costly. Update only if you know what you are doing', () => {
    expect(getBaseMappings()).toEqual({
      dynamic: 'strict',
      properties: {
        type: {
          type: 'keyword',
        },
        namespace: {
          type: 'keyword',
        },
        namespaces: {
          type: 'keyword',
        },
        originId: {
          type: 'keyword',
        },
        updated_at: {
          type: 'date',
        },
        created_at: {
          type: 'date',
        },
        created_by: {
          type: 'keyword',
        },
        references: {
          type: 'nested',
          properties: {
            name: {
              type: 'keyword',
            },
            type: {
              type: 'keyword',
            },
            id: {
              type: 'keyword',
            },
          },
        },
        coreMigrationVersion: {
          type: 'keyword',
        },
        typeMigrationVersion: {
          type: 'version',
        },
        managed: {
          type: 'boolean',
        },
      },
    });
  });
});
