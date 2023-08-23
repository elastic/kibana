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
import {
  checkTargetMappings,
  type ComparedMappingsChanged,
  type ComparedMappingsMatch,
} from './check_target_mappings';
import { getUpdatedHashes } from '../core/build_active_mappings';

jest.mock('../core/build_active_mappings');

const getUpdatedHashesMock = getUpdatedHashes as jest.MockedFn<typeof getUpdatedHashes>;

const properties: SavedObjectsMappingProperties = {
  type1: { type: 'long' },
  type2: { type: 'long' },
};

const migrationMappingPropertyHashes = {
  type1: 'type1Hash',
  type2: 'type2Hash',
};

const expectedMappings: IndexMapping = {
  properties,
  dynamic: 'strict',
  _meta: {
    migrationMappingPropertyHashes,
  },
};

describe('checkTargetMappings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when actual mappings are incomplete', () => {
    it("returns 'actual_mappings_incomplete' if actual mappings are not defined", async () => {
      const task = checkTargetMappings({
        expectedMappings,
      });

      const result = await task();
      expect(result).toEqual(Either.left({ type: 'actual_mappings_incomplete' as const }));
    });

    it("returns 'actual_mappings_incomplete' if actual mappings do not define _meta", async () => {
      const task = checkTargetMappings({
        expectedMappings,
        actualMappings: {
          properties,
          dynamic: 'strict',
        },
      });

      const result = await task();
      expect(result).toEqual(Either.left({ type: 'actual_mappings_incomplete' as const }));
    });

    it("returns 'actual_mappings_incomplete' if actual mappings do not define migrationMappingPropertyHashes", async () => {
      const task = checkTargetMappings({
        expectedMappings,
        actualMappings: {
          properties,
          dynamic: 'strict',
          _meta: {},
        },
      });

      const result = await task();
      expect(result).toEqual(Either.left({ type: 'actual_mappings_incomplete' as const }));
    });

    it("returns 'actual_mappings_incomplete' if actual mappings define a different value for 'dynamic' property", async () => {
      const task = checkTargetMappings({
        expectedMappings,
        actualMappings: {
          properties,
          dynamic: false,
          _meta: { migrationMappingPropertyHashes },
        },
      });

      const result = await task();
      expect(result).toEqual(Either.left({ type: 'actual_mappings_incomplete' as const }));
    });
  });

  describe('when actual mappings are complete', () => {
    describe('and mappings do not match', () => {
      it('returns the lists of changed root fields and types', async () => {
        const task = checkTargetMappings({
          expectedMappings,
          actualMappings: expectedMappings,
        });

        getUpdatedHashesMock.mockReturnValueOnce(['type1', 'type2', 'someRootField']);

        const result = await task();
        const expected: ComparedMappingsChanged = {
          type: 'compared_mappings_changed' as const,
          updatedHashes: ['type1', 'type2', 'someRootField'],
        };
        expect(result).toEqual(Either.left(expected));
      });
    });

    describe('and mappings match', () => {
      it('returns a compared_mappings_match response', async () => {
        const task = checkTargetMappings({
          expectedMappings,
          actualMappings: expectedMappings,
        });

        getUpdatedHashesMock.mockReturnValueOnce([]);

        const result = await task();
        const expected: ComparedMappingsMatch = {
          type: 'compared_mappings_match' as const,
        };
        expect(result).toEqual(Either.right(expected));
      });
    });
  });
});
