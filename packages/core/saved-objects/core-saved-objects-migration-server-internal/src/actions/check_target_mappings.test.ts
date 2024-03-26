/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Either from 'fp-ts/lib/Either';
import type { IndexMapping } from '@kbn/core-saved-objects-base-server-internal';
import type { SavedObjectsMappingProperties } from '@kbn/core-saved-objects-server';
import { checkTargetMappings } from './check_target_mappings';
import { getBaseMappings } from '../core';

const indexTypes = ['type1', 'type2', 'type3'];

const properties: SavedObjectsMappingProperties = {
  ...getBaseMappings().properties,
  type1: { type: 'long' },
  type2: { type: 'long' },
};

const migrationMappingPropertyHashes = {
  type1: 'someHash',
  type2: 'anotherHash',
};

const legacyMappings: IndexMapping = {
  properties,
  dynamic: 'strict',
  _meta: {
    migrationMappingPropertyHashes,
  },
};

const outdatedModelVersions = {
  type1: '10.1.0',
  type2: '10.2.0',
  type3: '10.4.0',
};

const modelVersions = {
  type1: '10.1.0',
  type2: '10.3.0',
  type3: '10.5.0',
};

const latestMappingsVersions = {
  type1: '10.1.0',
  type2: '10.2.0', // type is on '10.3.0' but its mappings were last updated on 10.2.0
  type3: '10.5.0',
};

const appMappings: IndexMapping = {
  properties,
  dynamic: 'strict',
  _meta: {
    migrationMappingPropertyHashes, // deprecated, but preserved to facilitate rollback
    mappingVersions: modelVersions,
  },
};

describe('checkTargetMappings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when index mappings are missing required properties', () => {
    it("returns 'index_mappings_incomplete' if index mappings are not defined", async () => {
      const task = checkTargetMappings({
        indexTypes,
        appMappings,
        latestMappingsVersions,
      });

      const result = await task();
      expect(result).toEqual(Either.left({ type: 'index_mappings_incomplete' as const }));
    });

    it("returns 'index_mappings_incomplete' if index mappings do not define _meta", async () => {
      const task = checkTargetMappings({
        indexTypes,
        appMappings,
        indexMappings: {
          properties,
          dynamic: 'strict',
        },
        latestMappingsVersions,
      });

      const result = await task();
      expect(result).toEqual(Either.left({ type: 'index_mappings_incomplete' as const }));
    });

    it("returns 'index_mappings_incomplete' if index mappings do not define migrationMappingPropertyHashes nor mappingVersions", async () => {
      const task = checkTargetMappings({
        indexTypes,
        appMappings,
        indexMappings: {
          properties,
          dynamic: 'strict',
          _meta: {},
        },
        latestMappingsVersions,
      });

      const result = await task();
      expect(result).toEqual(Either.left({ type: 'index_mappings_incomplete' as const }));
    });

    it("returns 'index_mappings_incomplete' if index mappings define a different value for 'dynamic' property", async () => {
      const task = checkTargetMappings({
        indexTypes,
        appMappings,
        indexMappings: {
          properties,
          dynamic: false,
          _meta: appMappings._meta,
        },
        latestMappingsVersions,
      });

      const result = await task();
      expect(result).toEqual(Either.left({ type: 'index_mappings_incomplete' as const }));
    });
  });

  describe('when index mappings have all required properties', () => {
    describe('when some core properties (aka root fields) have changed', () => {
      it('returns the list of fields that have changed', async () => {
        const task = checkTargetMappings({
          indexTypes,
          appMappings,
          indexMappings: {
            ...legacyMappings,
            properties: {
              ...legacyMappings.properties,
              references: {
                properties: {
                  ...legacyMappings.properties.references.properties,
                  description: { type: 'text' },
                },
              },
            },
          },
          latestMappingsVersions,
        });

        const result = await task();
        expect(result).toEqual(
          Either.left({
            type: 'root_fields_changed' as const,
            updatedFields: ['references'],
          })
        );
      });
    });

    describe('when core properties have NOT changed', () => {
      describe('when index mappings ONLY contain the legacy hashes', () => {
        describe('and legacy hashes match the current model versions', () => {
          it('returns a compared_mappings_match response', async () => {
            const task = checkTargetMappings({
              indexTypes,
              appMappings,
              indexMappings: legacyMappings,
              hashToVersionMap: {
                'type1|someHash': '10.1.0',
                'type2|anotherHash': '10.2.0',
                // type 3 is a new type
              },
              latestMappingsVersions,
            });

            const result = await task();
            expect(result).toEqual(
              Either.right({
                type: 'compared_mappings_match' as const,
              })
            );
          });
        });

        describe('and legacy hashes do NOT match the current model versions', () => {
          it('returns the list of updated SO types', async () => {
            const task = checkTargetMappings({
              indexTypes,
              appMappings,
              indexMappings: legacyMappings,
              hashToVersionMap: {
                'type1|someHash': '10.1.0',
                'type2|anotherHash': '10.1.0', // type2's mappings were updated on 10.2.0
              },
              latestMappingsVersions,
            });

            const result = await task();
            expect(result).toEqual(
              Either.left({
                type: 'types_changed' as const,
                updatedTypes: ['type2'],
              })
            );
          });
        });
      });

      describe('when index mappings contain the mappingVersions', () => {
        describe('and mappingVersions match', () => {
          it('returns a compared_mappings_match response', async () => {
            const task = checkTargetMappings({
              indexTypes,
              appMappings,
              indexMappings: {
                ...appMappings,
                _meta: {
                  ...appMappings._meta,
                  mappingVersions: {
                    type1: '10.1.0',
                    type2: '10.2.0', // type 2 was still on 10.2.0, but 10.3.0 does not bring mappings changes
                    type3: '10.5.0',
                  },
                },
              },
              latestMappingsVersions,
            });

            const result = await task();
            expect(result).toEqual(
              Either.right({
                type: 'compared_mappings_match' as const,
              })
            );
          });
        });

        describe('and mappingVersions do NOT match', () => {
          it('returns the list of updated SO types', async () => {
            const task = checkTargetMappings({
              indexTypes,
              appMappings,
              indexMappings: {
                properties,
                dynamic: 'strict',
                _meta: {
                  mappingVersions: outdatedModelVersions,
                },
              },
              latestMappingsVersions,
            });

            const result = await task();
            expect(result).toEqual(
              Either.left({
                type: 'types_changed' as const,
                updatedTypes: ['type3'],
              })
            );
          });
        });
      });
    });
  });
});
