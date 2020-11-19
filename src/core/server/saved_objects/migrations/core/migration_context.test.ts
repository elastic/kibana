/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { disableUnknownTypeMappingFields } from './migration_context';

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
  };
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
  };
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
        // old_field was present in source but ommited in active mappings
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
});
