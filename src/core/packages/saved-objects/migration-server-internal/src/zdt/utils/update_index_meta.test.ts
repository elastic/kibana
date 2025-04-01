/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  IndexMappingMeta,
  VirtualVersionMap,
} from '@kbn/core-saved-objects-base-server-internal';
import {
  setMetaDocMigrationStarted,
  setMetaDocMigrationComplete,
  setMetaMappingMigrationComplete,
  removePropertiesFromV2,
} from './update_index_meta';

const getDefaultMeta = (): IndexMappingMeta => ({
  mappingVersions: {
    foo: '10.1.0',
    bar: '10.1.0',
  },
  docVersions: {
    foo: '10.1.0',
    bar: '10.1.0',
  },
  migrationState: {
    convertingDocuments: false,
  },
});

describe('setMetaMappingMigrationComplete', () => {
  it('updates the meta to set the mappingVersions', () => {
    const meta: IndexMappingMeta = getDefaultMeta();
    const versions: VirtualVersionMap = { foo: '10.3.0', bar: '10.2.0' };

    const updated = setMetaMappingMigrationComplete({ meta, versions });

    expect(updated).toEqual({
      ...meta,
      mappingVersions: versions,
    });
  });
});

describe('setMetaDocMigrationStarted', () => {
  it('updates the meta to set the mappingVersions', () => {
    const meta: IndexMappingMeta = getDefaultMeta();

    const updated = setMetaDocMigrationStarted({ meta });

    expect(updated).toEqual({
      ...meta,
      migrationState: {
        convertingDocuments: true,
      },
    });
  });
});

describe('setMetaDocMigrationComplete', () => {
  it('updates the meta to set the mappingVersions', () => {
    const meta: IndexMappingMeta = {
      ...getDefaultMeta(),
      migrationState: {
        convertingDocuments: true,
      },
    };
    const versions: VirtualVersionMap = { foo: '10.3.0', bar: '10.2.0' };

    const updated = setMetaDocMigrationComplete({ meta, versions });

    expect(updated).toEqual({
      ...meta,
      docVersions: versions,
      migrationState: {
        convertingDocuments: false,
      },
    });
  });
});

describe('removePropertiesFromV2', () => {
  it('removes meta properties used by the v2 algorithm', () => {
    const meta: IndexMappingMeta = {
      ...getDefaultMeta(),
      indexTypesMap: {
        '.kibana': ['foo'],
      },
      migrationMappingPropertyHashes: {
        foo: 'someHash',
      },
    };

    const output = removePropertiesFromV2(meta);
    expect(output).toEqual(getDefaultMeta());
  });
});
