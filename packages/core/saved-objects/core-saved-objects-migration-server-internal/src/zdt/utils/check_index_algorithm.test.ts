/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IndexMapping } from '@kbn/core-saved-objects-base-server-internal';
import { checkIndexCurrentAlgorithm } from './check_index_algorithm';

describe('checkIndexCurrentAlgorithm', () => {
  it('returns `unknown` if _meta is not present on the mapping', () => {
    const mapping: IndexMapping = {
      properties: {},
    };

    expect(checkIndexCurrentAlgorithm(mapping)).toEqual('unknown');
  });

  it('returns `unknown` if _meta is present but empty', () => {
    const mapping: IndexMapping = {
      properties: {
        _meta: {},
      },
    };

    expect(checkIndexCurrentAlgorithm(mapping)).toEqual('unknown');
  });

  it('returns `zdt` if all zdt metas are present', () => {
    const mapping: IndexMapping = {
      properties: {},
      _meta: {
        docVersions: {
          foo: '8.8.0',
        },
        mappingVersions: {
          foo: '8.8.0',
        },
      },
    };

    expect(checkIndexCurrentAlgorithm(mapping)).toEqual('zdt');
  });

  it('returns `v2-partially-migrated` if only mappingVersions is present', () => {
    const mapping: IndexMapping = {
      properties: {},
      _meta: {
        mappingVersions: {
          foo: '8.8.0',
        },
      },
    };

    expect(checkIndexCurrentAlgorithm(mapping)).toEqual('v2-partially-migrated');
  });

  it('returns `unknown` if if mappingVersions and v2 hashes are present', () => {
    const mapping: IndexMapping = {
      properties: {},
      _meta: {
        migrationMappingPropertyHashes: {
          foo: 'someHash',
        },
        mappingVersions: {
          foo: '8.8.0',
        },
      },
    };

    expect(checkIndexCurrentAlgorithm(mapping)).toEqual('v2-partially-migrated');
  });

  it('returns `v2-incompatible` if v2 hashes are present but not indexTypesMap', () => {
    const mapping: IndexMapping = {
      properties: {},
      _meta: {
        migrationMappingPropertyHashes: {
          foo: 'someHash',
        },
      },
    };

    expect(checkIndexCurrentAlgorithm(mapping)).toEqual('v2-incompatible');
  });

  it('returns `v2-compatible` if v2 hashes and indexTypesMap are present', () => {
    const mapping: IndexMapping = {
      properties: {},
      _meta: {
        migrationMappingPropertyHashes: {
          foo: 'someHash',
        },
        indexTypesMap: {
          '.kibana': ['foo'],
        },
      },
    };

    expect(checkIndexCurrentAlgorithm(mapping)).toEqual('v2-compatible');
  });
});
