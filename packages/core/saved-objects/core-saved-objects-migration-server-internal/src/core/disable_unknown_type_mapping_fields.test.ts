/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { disableUnknownTypeMappingFields } from './disable_unknown_type_mapping_fields';

describe('disableUnknownTypeMappingFields', () => {
  const sourceMappings = {
    _meta: {
      migrationMappingPropertyHashes: {
        unknown_type: 'md5hash',
        unknown_core_field: 'md5hash',
        known_type: 'oldmd5hash',
      },
    },
    properties: {
      unknown_type: {
        properties: {
          unused_field: { type: 'text' },
        },
      },
      unknown_core_field: { type: 'keyword' },
      known_type: {
        properties: {
          field_1: { type: 'text' },
          old_field: { type: 'boolean' },
        },
      },
    },
  } as const;
  const activeMappings = {
    _meta: {
      migrationMappingPropertyHashes: {
        known_type: 'md5hash',
      },
    },
    properties: {
      known_type: {
        properties: {
          new_field: { type: 'binary' },
          field_1: { type: 'keyword' },
        },
      },
    },
  } as const;
  const targetMappings = disableUnknownTypeMappingFields(activeMappings, sourceMappings);

  it('disables complex field mappings from unknown types in the source mappings', () => {
    expect(targetMappings.properties.unknown_type).toEqual({ dynamic: false, properties: {} });
  });

  it('retains unknown core field mappings from the source mappings', () => {
    expect(targetMappings.properties.unknown_core_field).toEqual({ type: 'keyword' });
  });

  it('overrides source mappings with known types from active mappings', () => {
    expect(targetMappings.properties.known_type).toEqual({
      properties: {
        new_field: { type: 'binary' },
        field_1: { type: 'keyword' }, // was type text in source mappings
        // old_field was present in source but omitted in active mappings
      },
    });
  });

  it('retains the active mappings _meta ignoring any _meta fields in the source mappings', () => {
    expect(targetMappings._meta).toEqual({
      migrationMappingPropertyHashes: {
        known_type: 'md5hash',
      },
    });
  });

  it('does not fail if the source mapping does not have `properties` defined', () => {
    const missingPropertiesMappings = {
      ...sourceMappings,
      properties: undefined,
    };
    const result = disableUnknownTypeMappingFields(
      activeMappings,
      // @ts-expect-error `properties` should not be undefined
      missingPropertiesMappings
    );

    expect(Object.keys(result.properties)).toEqual(['known_type']);
  });
});
