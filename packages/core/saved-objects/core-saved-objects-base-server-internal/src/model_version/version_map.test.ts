/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectsType, SavedObjectsModelVersion } from '@kbn/core-saved-objects-server';
import { getModelVersionMapForTypes, getLatestModelVersion } from './version_map';

describe('ModelVersion map utilities', () => {
  const buildType = (parts: Partial<SavedObjectsType> = {}): SavedObjectsType => ({
    name: 'test-type',
    hidden: false,
    namespaceType: 'single',
    mappings: { properties: {} },
    ...parts,
  });

  const dummyModelVersion = (): SavedObjectsModelVersion => ({
    modelChange: {
      type: 'expansion',
    },
  });

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
});
