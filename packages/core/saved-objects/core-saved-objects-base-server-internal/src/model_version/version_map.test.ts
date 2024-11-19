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
  getLatestMigrationVersion,
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

  describe('getLatestMigrationVersion', () => {
    it('returns 0.0.0 when no migrations are registered', () => {
      expect(getLatestMigrationVersion(buildType({ migrations: {} }))).toEqual('0.0.0');
      expect(getLatestMigrationVersion(buildType({ migrations: undefined }))).toEqual('0.0.0');
    });

    it('throws if an invalid version is provided', () => {
      expect(() =>
        getLatestMigrationVersion(
          buildType({
            migrations: {
              foo: dummyMigration,
              '8.6.0': dummyMigration,
            },
          })
        )
      ).toThrowError();
    });

    it('returns the latest registered version', () => {
      expect(
        getLatestMigrationVersion(
          buildType({
            migrations: {
              '7.17.2': dummyMigration,
              '8.6.0': dummyMigration,
            },
          })
        )
      ).toEqual('8.6.0');
    });

    it('accepts provider functions', () => {
      expect(
        getLatestMigrationVersion(
          buildType({
            migrations: () => ({
              '7.17.2': dummyMigration,
              '8.4.0': dummyMigration,
            }),
          })
        )
      ).toEqual('8.4.0');
    });

    it('supports unordered maps', () => {
      expect(
        getLatestMigrationVersion(
          buildType({
            migrations: {
              '7.17.2': dummyMigration,
              '8.7.0': dummyMigration,
              '8.2.0': dummyMigration,
            },
          })
        )
      ).toEqual('8.7.0');
    });
  });

  describe('getCurrentVirtualVersion', () => {
    it('returns the latest registered migration if switchToModelVersionAt is unset', () => {
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
          })
        )
      ).toEqual('8.6.0');
    });

    it('returns the virtual version of the latest model version if switchToModelVersionAt is set', () => {
      expect(
        getCurrentVirtualVersion(
          buildType({
            switchToModelVersionAt: '8.7.0',
            migrations: {
              '7.17.2': dummyMigration,
              '8.6.0': dummyMigration,
            },
            modelVersions: {
              1: dummyModelVersion(),
            },
          })
        )
      ).toEqual('10.1.0');
    });
  });

  describe('getVirtualVersionMap', () => {
    it('returns the virtual version for each of the provided types', () => {
      expect(
        getVirtualVersionMap([
          buildType({
            name: 'foo',
            switchToModelVersionAt: '8.7.0',
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
            modelVersions: {
              1: dummyModelVersion(),
            },
          }),
          buildType({
            name: 'dolly',
            switchToModelVersionAt: '8.7.0',
            migrations: {
              '7.17.2': dummyMigration,
              '8.6.0': dummyMigration,
            },
          }),
        ])
      ).toEqual({
        foo: '10.1.0',
        bar: '8.6.0',
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
    it('returns the latest registered migration if switchToModelVersionAt is unset', () => {
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
      ).toEqual('8.6.0');
    });

    it('returns the virtual version of the latest model version if switchToModelVersionAt is set', () => {
      expect(
        getLatestMappingsModelVersion(
          buildType({
            switchToModelVersionAt: '8.7.0',
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
            switchToModelVersionAt: '8.7.0',
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
            modelVersions: {
              1: dummyModelVersionWithMappingsChanges(),
              2: dummyModelVersion(),
            },
          }),
          buildType({
            name: 'dolly',
            switchToModelVersionAt: '8.7.0',
            migrations: {
              '7.17.2': dummyMigration,
              '8.6.0': dummyMigration,
            },
          }),
        ])
      ).toEqual({
        foo: '10.1.0',
        bar: '8.6.0',
        dolly: '10.0.0',
      });
    });
  });
});
