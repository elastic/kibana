/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsType, SavedObjectsModelVersion } from '@kbn/core-saved-objects-server';
import {
  getModelVersionMapForTypes,
  getLatestModelVersion,
  getCurrentVirtualVersion,
  getVirtualVersionMap,
  getLatestMappingsVersionNumber,
  getLatestMappingsModelVersion,
  getLatestMappingsVirtualVersionMap,
} from './version_map';

describe('ModelVersion map utilities', () => {
  const buildType = (parts: Partial<SavedObjectsType> = {}): SavedObjectsType => ({
    name: 'test-type',
    hidden: false,
    namespaceType: 'single',
    mappings: { properties: {} },
    ...parts,
  });

  const dummyModelVersion = (): SavedObjectsModelVersion => ({
    changes: [],
  });

  const dummyModelVersionWithMappingsChanges = (): SavedObjectsModelVersion => ({
    changes: [
      {
        type: 'mappings_addition',
        addedMappings: {},
      },
    ],
  });

  const dummyModelVersionWithDataRemoval = (): SavedObjectsModelVersion => ({
    changes: [
      {
        type: 'data_removal',
        removedAttributePaths: ['some.attribute'],
      },
    ],
  });

  const dummyMigration = jest.fn();

  describe('getLatestModelVersion', () => {
    it('returns 0 when no model versions are registered', () => {
      expect(getLatestModelVersion(buildType({ modelVersions: {} }))).toEqual(0);
      expect(getLatestModelVersion(buildType({ modelVersions: undefined }))).toEqual(0);
    });

    it('throws if an invalid version is provided', () => {
      expect(() =>
        getLatestModelVersion(
          buildType({
            modelVersions: {
              // @ts-expect-error
              foo: dummyModelVersion(),
            },
          })
        )
      ).toThrow();
    });

    it('returns the latest registered version', () => {
      expect(
        getLatestModelVersion(
          buildType({
            modelVersions: {
              '1': dummyModelVersion(),
              '2': dummyModelVersion(),
              '3': dummyModelVersion(),
            },
          })
        )
      ).toEqual(3);
    });

    it('accepts provider functions', () => {
      expect(
        getLatestModelVersion(
          buildType({
            modelVersions: () => ({
              '1': dummyModelVersion(),
              '2': dummyModelVersion(),
              '3': dummyModelVersion(),
            }),
          })
        )
      ).toEqual(3);
    });

    it('supports unordered maps', () => {
      expect(
        getLatestModelVersion(
          buildType({
            modelVersions: {
              '3': dummyModelVersion(),
              '1': dummyModelVersion(),
              '2': dummyModelVersion(),
            },
          })
        )
      ).toEqual(3);
    });
  });

  describe('getModelVersionMapForTypes', () => {
    it('returns a map with the latest version of the provided types', () => {
      expect(
        getModelVersionMapForTypes([
          buildType({
            name: 'foo',
            modelVersions: {
              '1': dummyModelVersion(),
              '2': dummyModelVersion(),
            },
          }),
          buildType({
            name: 'bar',
            modelVersions: {},
          }),
          buildType({
            name: 'dolly',
            modelVersions: {
              '1': dummyModelVersion(),
              '2': dummyModelVersion(),
              '3': dummyModelVersion(),
            },
          }),
        ])
      ).toEqual({
        foo: 2,
        bar: 0,
        dolly: 3,
      });
    });
  });

  describe('getCurrentVirtualVersion', () => {
    it('returns the latest migration if modelVersions are not defined', () => {
      expect(
        getCurrentVirtualVersion(
          buildType({
            migrations: {
              '7.17.2': dummyMigration,
              '8.6.0': dummyMigration,
            },
          }),
          false
        )
      ).toEqual('8.6.0');
    });

    it('returns the default modelVersion (10.0.0) if modelVersions are not defined and we disregard legacy migrations', () => {
      expect(
        getCurrentVirtualVersion(
          buildType({
            migrations: {
              '7.17.2': dummyMigration,
              '8.6.0': dummyMigration,
            },
          }),
          true
        )
      ).toEqual('10.0.0');
    });

    it('returns the virtual version of the latest model version if the type has modelVersions', () => {
      expect(
        getCurrentVirtualVersion(
          buildType({
            migrations: {
              '7.17.2': dummyMigration,
              '8.6.0': dummyMigration,
            },
            modelVersions: {
              1: dummyModelVersion(),
            },
          }),
          false
        )
      ).toEqual('10.1.0');
    });

    it('returns at least 10.1.0 when a type declares semanticSearch with no model versions (useModelVersionsOnly=true)', () => {
      // Simulates the ZDT mapping-version check: a type opting into semanticSearch for the first
      // time must be detected as changed against an existing index at 10.0.0.
      expect(
        getCurrentVirtualVersion(
          buildType({
            mappings: { properties: { title: { type: 'text' } } },
            semanticSearch: { fields: ['title'] },
          }),
          true
        )
      ).toEqual('10.1.0');
    });

    it('returns the migration version (not bumped) for semanticSearch with no modelVersions when useModelVersionsOnly=false', () => {
      // Only the model-version branch is bumped; the legacy-migration branch is not, so
      // outdated-document queries for types with no modelVersions are unaffected.
      expect(
        getCurrentVirtualVersion(
          buildType({
            migrations: { '8.6.0': dummyMigration },
            mappings: { properties: { title: { type: 'text' } } },
            semanticSearch: { fields: ['title'] },
          }),
          false
        )
      ).toEqual('8.6.0');
    });

    it('bumps a type with existing model versions by +1 when semanticSearch is declared', () => {
      // This is the key case that the Math.max(n,1) semantics missed: a type already at
      // model version 3 gets max(3,1)=3 (no-op). The +1 semantics produce 3+1=4=10.4.0,
      // which is detectable against a stored 10.3.0.
      expect(
        getCurrentVirtualVersion(
          buildType({
            modelVersions: {
              1: dummyModelVersion(),
              2: dummyModelVersion(),
              3: dummyModelVersion(),
            },
            mappings: { properties: { title: { type: 'text' } } },
            semanticSearch: { fields: ['title'] },
          }),
          true
        )
      ).toEqual('10.4.0');
    });

    it('returns the natural latest version (no bump) for the same type without semanticSearch', () => {
      expect(
        getCurrentVirtualVersion(
          buildType({
            modelVersions: {
              1: dummyModelVersion(),
              2: dummyModelVersion(),
              3: dummyModelVersion(),
            },
            mappings: { properties: { title: { type: 'text' } } },
          }),
          true
        )
      ).toEqual('10.3.0');
    });
  });

  describe('getVirtualVersionMap', () => {
    it('returns the latest type version for each of the provided types', () => {
      expect(
        getVirtualVersionMap({
          types: [
            buildType({
              name: 'foo',
              migrations: {
                '7.17.2': dummyMigration,
                '8.6.0': dummyMigration,
              },
              modelVersions: {
                1: dummyModelVersion(),
              },
            }),
            buildType({
              name: 'bar',
              migrations: {
                '7.17.2': dummyMigration,
                '8.6.0': dummyMigration,
              },
            }),
            buildType({
              name: 'dolly',
            }),
          ],
          useModelVersionsOnly: false,
        })
      ).toEqual({
        foo: '10.1.0',
        bar: '8.6.0',
        dolly: '0.0.0',
      });
    });

    it('returns the latest virtual version for each of the provided types', () => {
      expect(
        getVirtualVersionMap({
          types: [
            buildType({
              name: 'foo',
              migrations: {
                '7.17.2': dummyMigration,
                '8.6.0': dummyMigration,
              },
              modelVersions: {
                1: dummyModelVersion(),
              },
            }),
            buildType({
              name: 'bar',
              migrations: {
                '7.17.2': dummyMigration,
                '8.6.0': dummyMigration,
              },
            }),
            buildType({
              name: 'dolly',
            }),
          ],
          useModelVersionsOnly: true,
        })
      ).toEqual({
        foo: '10.1.0',
        bar: '10.0.0',
        dolly: '10.0.0',
      });
    });
  });

  describe('getLatestMappingsVersionNumber', () => {
    it('returns 0 when no model versions are registered', () => {
      expect(getLatestMappingsVersionNumber(buildType({ modelVersions: {} }))).toEqual(0);
      expect(getLatestMappingsVersionNumber(buildType({ modelVersions: undefined }))).toEqual(0);
    });

    it('throws if an invalid version is provided', () => {
      expect(() =>
        getLatestMappingsVersionNumber(
          buildType({
            modelVersions: {
              // @ts-expect-error
              foo: dummyModelVersionWithMappingsChanges(),
            },
          })
        )
      ).toThrow();
    });

    it('returns the latest version that brings mappings changes', () => {
      expect(
        getLatestMappingsVersionNumber(
          buildType({
            modelVersions: {
              '1': dummyModelVersion(),
              '2': dummyModelVersionWithMappingsChanges(),
              '3': dummyModelVersionWithDataRemoval(),
            },
          })
        )
      ).toEqual(2);
    });

    it('returns at least 1 for a type that declares semanticSearch with no model versions', () => {
      expect(
        getLatestMappingsVersionNumber(
          buildType({
            mappings: { properties: { title: { type: 'text' } } },
            semanticSearch: { fields: ['title'] },
          })
        )
      ).toEqual(1);
    });

    it('bumps a type with existing mappings versions by +1 when semanticSearch is declared', () => {
      // This mirrors the getCurrentVirtualVersion fix: Math.max(3,1)=3 was a no-op.
      // The +1 semantics produce 3+1=4, detectable against a stored 10.3.0.
      expect(
        getLatestMappingsVersionNumber(
          buildType({
            mappings: { properties: { title: { type: 'text' } } },
            modelVersions: {
              '1': dummyModelVersion(),
              '2': dummyModelVersion(),
              '3': dummyModelVersionWithMappingsChanges(),
            },
            semanticSearch: { fields: ['title'] },
          })
        )
      ).toEqual(4);
    });

    it('returns the natural latest version (no bump) for the same type without semanticSearch', () => {
      expect(
        getLatestMappingsVersionNumber(
          buildType({
            mappings: { properties: { title: { type: 'text' } } },
            modelVersions: {
              '1': dummyModelVersion(),
              '2': dummyModelVersion(),
              '3': dummyModelVersionWithMappingsChanges(),
            },
          })
        )
      ).toEqual(3);
    });

    it('agrees with getCurrentVirtualVersion on the effective version, preventing an infinite mapping-update loop', () => {
      // After a migration stamps the bumped version via getCurrentVirtualVersion, on the next
      // boot getLatestMappingsVersionNumber must return the same effective number so the type
      // is not re-detected as needing a mapping update.
      const type = buildType({
        modelVersions: {
          '1': dummyModelVersion(),
          '2': dummyModelVersion(),
          '3': dummyModelVersionWithMappingsChanges(),
        },
        mappings: { properties: { title: { type: 'text' } } },
        semanticSearch: { fields: ['title'] },
      });
      const mappingsVersion = getLatestMappingsVersionNumber(type); // 3+1=4
      const virtualVersion = getCurrentVirtualVersion(type, true); // 10.4.0
      expect(virtualVersion).toEqual(`10.${mappingsVersion}.0`);
    });

    it('accepts provider functions', () => {
      expect(
        getLatestMappingsVersionNumber(
          buildType({
            modelVersions: () => ({
              '1': dummyModelVersion(),
              '2': dummyModelVersionWithMappingsChanges(),
              '3': dummyModelVersionWithDataRemoval(),
            }),
          })
        )
      ).toEqual(2);
    });

    it('supports unordered maps', () => {
      expect(
        getLatestMappingsVersionNumber(
          buildType({
            modelVersions: {
              '3': dummyModelVersionWithDataRemoval(),
              '1': dummyModelVersion(),
              '2': dummyModelVersionWithMappingsChanges(),
            },
          })
        )
      ).toEqual(2);
    });
  });

  describe('getLatestMappingsModelVersion', () => {
    it('returns the default model version (10.0.0) if no model versions are defined', () => {
      expect(
        getLatestMappingsModelVersion(
          buildType({
            migrations: {
              '7.17.2': dummyMigration,
              '8.6.0': dummyMigration,
            },
          })
        )
      ).toEqual('10.0.0');
    });

    it('returns the virtual version of the latest model version if model versions are defined', () => {
      expect(
        getLatestMappingsModelVersion(
          buildType({
            migrations: {
              '7.17.2': dummyMigration,
              '8.6.0': dummyMigration,
            },
            modelVersions: {
              1: dummyModelVersionWithMappingsChanges(),
              2: dummyModelVersion(),
            },
          })
        )
      ).toEqual('10.1.0');
    });
  });

  describe('getLatestMappingsVirtualVersionMap', () => {
    it('returns the virtual version for each of the provided types', () => {
      expect(
        getLatestMappingsVirtualVersionMap([
          buildType({
            name: 'foo',
            migrations: {
              '7.17.2': dummyMigration,
              '8.6.0': dummyMigration,
            },
            modelVersions: {
              1: dummyModelVersionWithMappingsChanges(),
              2: dummyModelVersion(),
            },
          }),
          buildType({
            name: 'bar',
            migrations: {
              '7.17.2': dummyMigration,
              '8.6.0': dummyMigration,
            },
          }),
          buildType({
            name: 'dolly',
            migrations: {
              '7.17.2': dummyMigration,
              '8.6.0': dummyMigration,
            },
          }),
        ])
      ).toEqual({
        foo: '10.1.0',
        bar: '10.0.0',
        dolly: '10.0.0',
      });
    });

    it('returns at least 10.1.0 for a type that declares semanticSearch without explicit model versions', () => {
      // This is the key property that makes v2 change-detection fire when an existing type
      // opts into semanticSearch against an already-migrated index (stored at 10.0.0).
      expect(
        getLatestMappingsVirtualVersionMap([
          buildType({
            name: 'withSemantic',
            mappings: { properties: { title: { type: 'text' } } },
            semanticSearch: { fields: ['title'] },
          }),
          buildType({
            name: 'noSemantic',
          }),
        ])
      ).toEqual({
        withSemantic: '10.1.0',
        noSemantic: '10.0.0',
      });
    });
  });
});
