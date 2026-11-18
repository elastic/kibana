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
  assertValidModelVersion,
  getCurrentVirtualVersion,
  getLatestModelVersion,
  modelVersionToVirtualVersion,
} from './virtual_version';

describe('modelVersionToVirtualVersion', () => {
  it('converts the given model version to its virtual version', () => {
    expect(modelVersionToVirtualVersion(0)).toEqual('10.0.0');
    expect(modelVersionToVirtualVersion(7)).toEqual('10.7.0');
    expect(modelVersionToVirtualVersion(12)).toEqual('10.12.0');
  });
});

describe('assertValidModelVersion', () => {
  it('throws if the provided value is not an integer', () => {
    expect(() => assertValidModelVersion(9.4)).toThrowErrorMatchingInlineSnapshot(
      `"Model version must be an integer"`
    );
    expect(() => assertValidModelVersion('7.6')).toThrowErrorMatchingInlineSnapshot(
      `"Model version must be an integer"`
    );
  });

  it('throws if the provided value is a negative integer', () => {
    expect(() => assertValidModelVersion(-4)).toThrowErrorMatchingInlineSnapshot(
      `"Model version cannot be negative"`
    );
    expect(() => assertValidModelVersion('-3')).toThrowErrorMatchingInlineSnapshot(
      `"Model version cannot be negative"`
    );
  });

  it('returns the model version as a number', () => {
    expect(assertValidModelVersion(4)).toEqual(4);
    expect(assertValidModelVersion('3')).toEqual(3);
  });
});

describe('virtual version utilities', () => {
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
  });
});
