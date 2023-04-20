/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  IndexMappingMeta,
  ModelVersionMap,
} from '@kbn/core-saved-objects-base-server-internal';
import {
  setMetaDocMigrationStarted,
  setMetaDocMigrationComplete,
  setMetaMappingMigrationComplete,
} from './update_index_meta';

const getDefaultMeta = (): IndexMappingMeta => ({
  mappingVersions: {
    foo: 1,
    bar: 1,
  },
  docVersions: {
    foo: 1,
    bar: 1,
  },
  migrationState: {
    convertingDocuments: false,
  },
});

describe('setMetaMappingMigrationComplete', () => {
  it('updates the meta to set the mappingVersions', () => {
    const meta: IndexMappingMeta = getDefaultMeta();
    const versions: ModelVersionMap = { foo: 3, bar: 2 };

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
    const versions: ModelVersionMap = { foo: 3, bar: 2 };

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
