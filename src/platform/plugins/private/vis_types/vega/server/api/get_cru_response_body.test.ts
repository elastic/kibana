/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObject } from '@kbn/core/server';
import { ZodError } from '@kbn/zod';
import type { StoredVegaLibraryItemState } from '../vega_saved_object';
import { getVegaCRUResponseBody } from './get_cru_response_body';

describe('getVegaCRUResponseBody', () => {
  test('returns the saved object id, API state, and meta', () => {
    const attributes = {
      title: 'Vega chart',
      spec: { format: 'json' as const, value: { mark: 'point' } },
    };
    const savedObject: SavedObject<StoredVegaLibraryItemState> = {
      id: 'vega-library-item-id',
      type: 'vega',
      attributes,
      references: [],
    };

    expect(getVegaCRUResponseBody(savedObject)).toEqual({
      id: 'vega-library-item-id',
      data: { ...attributes, tags: [] },
      meta: { managed: false },
    });
  });

  describe('when the stored item does not satisfy the response schema', () => {
    const getSavedObject = (
      attributes: Partial<StoredVegaLibraryItemState>
    ): SavedObject<StoredVegaLibraryItemState> => ({
      id: 'vega-library-item-id',
      type: 'vega',
      attributes: attributes as StoredVegaLibraryItemState,
      references: [],
    });

    // A plain error, not a ZodError, so that `writeErrorHandler` responds with a 500 instead of a 400.
    const expectServerError = (savedObject: SavedObject<StoredVegaLibraryItemState>) => {
      let thrown: unknown;
      try {
        getVegaCRUResponseBody(savedObject);
      } catch (error) {
        thrown = error;
      }
      expect(thrown).toBeInstanceOf(Error);
      expect(thrown).not.toBeInstanceOf(ZodError);
      expect((thrown as Error).message).toContain(
        'Vega library item vega-library-item-id does not match the response schema'
      );
    };

    test('throws a server error when the spec is invalid', () => {
      expectServerError(
        getSavedObject({ title: 'Vega chart', spec: { format: 'hjson', value: '' } })
      );
    });

    test('throws a server error when a filter is invalid', () => {
      const filterWithUnknownKey = {
        type: 'condition' as const,
        condition: { field: 'host', operator: 'exists' as const },
        unexpected: true,
      };
      expectServerError(
        getSavedObject({
          title: 'Vega chart',
          spec: { format: 'hjson', value: '{}' },
          filters: [filterWithUnknownKey],
        })
      );
    });
  });
});
