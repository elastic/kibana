/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createEmbeddableSetupMock } from '@kbn/embeddable-plugin/server/mocks';
import { getSearchEmbeddableTransforms } from './search_embeddable_transforms';
import { extract, inject } from './search_inject_extract';
import type {
  SearchEmbeddableByValueState,
  StoredSearchEmbeddableByValueState,
  StoredSearchEmbeddableState,
  SearchEmbeddableByReferenceState,
} from './types';

jest.mock('./search_inject_extract', () => {
  return {
    inject: jest.fn((state, references) => state),
    extract: jest.fn((state) => ({ state, references: [] })),
  };
});

const { transformEnhancementsIn, transformEnhancementsOut } = createEmbeddableSetupMock();
transformEnhancementsIn.mockImplementation((state) => ({
  state,
  references: [],
}));
transformEnhancementsOut.mockImplementation((state) => state);

describe('searchEmbeddableTransforms', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('transformOut', () => {
    it('returns the state unchanged if attributes are not present', () => {
      const state: StoredSearchEmbeddableState = {
        title: 'Test Title',
        description: 'Test Description',
      };
      const result = getSearchEmbeddableTransforms(
        transformEnhancementsIn,
        transformEnhancementsOut
      ).transformOut?.(state);
      expect(result).toEqual(state);
    });

    it('transforms the state by extracting tabs if attributes are present', () => {
      const state = {
        title: 'Test Title',
        description: 'Test Description',
        attributes: {
          title: 'Test Title',
          description: 'Test Description',
          columns: ['column1', 'column2'],
        },
      } as StoredSearchEmbeddableByValueState;
      const references = [
        {
          name: 'ref1',
          type: 'type1',
          id: 'id1',
        },
      ];
      const expectedAttributes = {
        title: 'Test Title',
        description: 'Test Description',
        columns: ['column1', 'column2'],
        tabs: [
          {
            id: expect.any(String),
            label: 'Untitled',
            attributes: {
              columns: ['column1', 'column2'],
            },
          },
        ],
      };
      const result = getSearchEmbeddableTransforms(
        transformEnhancementsIn,
        transformEnhancementsOut
      ).transformOut?.(state, references);
      expect(inject).toHaveBeenCalledWith(
        { type: 'search', ...{ ...state, attributes: expectedAttributes } },
        references
      );
      expect(result).toEqual({
        ...state,
        attributes: expectedAttributes,
      });
    });

    it('handles empty attributes gracefully', () => {
      const state = {
        title: 'Test Title',
        description: 'Test Description',
        attributes: {},
      } as StoredSearchEmbeddableByValueState;
      const expectedAttributes = {
        tabs: [
          {
            id: expect.any(String),
            label: 'Untitled',
            attributes: {},
          },
        ],
      };
      const result = getSearchEmbeddableTransforms(
        transformEnhancementsIn,
        transformEnhancementsOut
      ).transformOut?.(state);
      expect(result).toEqual({
        ...state,
        attributes: expectedAttributes,
      });
    });
    it('transforms enhancements during transformOut', () => {
      const state: StoredSearchEmbeddableState = {
        title: 'Test Title',
        description: 'Test Description',
        enhancements: {
          dynamicActions: { events: [] },
        },
      };
      const mockReferences = [{ name: 'enhRef', type: 'dynamicAction', id: 'foo' }];
      const result = getSearchEmbeddableTransforms(
        transformEnhancementsIn,
        transformEnhancementsOut
      ).transformOut?.(state, mockReferences);
      expect(transformEnhancementsOut).toHaveBeenCalledWith(
        {
          dynamicActions: { events: [] },
        },
        mockReferences
      );
      expect(result).toEqual({
        ...state,
      });
    });
  });
  describe('transformIn', () => {
    describe('by-reference state', () => {
      it('transforms by-reference state', () => {
        const serializedState: SearchEmbeddableByReferenceState = {
          savedObjectId: 'test-saved-object-id',
          title: 'Test Search',
          description: 'Test Description',
          enhancements: {
            dynamicActions: { events: [] },
          },
          columns: ['field1', 'field2'],
          sort: [['timestamp', 'desc']],
        };

        const result = getSearchEmbeddableTransforms(
          transformEnhancementsIn,
          transformEnhancementsOut
        ).transformIn!(serializedState);

        expect(result.state).toEqual({
          title: 'Test Search',
          description: 'Test Description',
          columns: ['field1', 'field2'],
          sort: [['timestamp', 'desc']],
          enhancements: expect.any(Object),
        });

        expect(result.references).toEqual([
          {
            name: 'savedObjectRef',
            type: 'search',
            id: 'test-saved-object-id',
          },
        ]);

        expect(transformEnhancementsIn).toHaveBeenCalledWith({
          dynamicActions: { events: [] },
        });
      });

      it('handles by-reference state without enhancements', () => {
        const serializedState: SearchEmbeddableByReferenceState = {
          savedObjectId: 'test-saved-object-id',
          title: 'Test Search',
          columns: ['field1'],
        };

        const result = getSearchEmbeddableTransforms(
          transformEnhancementsIn,
          transformEnhancementsOut
        ).transformIn!(serializedState);

        expect(result.state).toEqual({
          title: 'Test Search',
          columns: ['field1'],
        });

        expect(result.references).toEqual([
          {
            name: 'savedObjectRef',
            type: 'search',
            id: 'test-saved-object-id',
          },
        ]);

        expect(transformEnhancementsIn).not.toHaveBeenCalled();
      });
    });

    describe('by-value state', () => {
      it('transforms by-value state', () => {
        const serializedState: SearchEmbeddableByValueState = {
          attributes: {
            title: 'Test Search',
            description: 'Test Description',
            columns: ['field1', 'field2'],
            sort: [],
            grid: {},
            hideChart: false,
            isTextBasedQuery: false,
            kibanaSavedObjectMeta: {
              searchSourceJSON: '{"query":{"match_all":{}}}',
            },
            tabs: [],
            references: [],
          },
          title: 'Panel Title',
        };

        const result = getSearchEmbeddableTransforms(
          transformEnhancementsIn,
          transformEnhancementsOut
        ).transformIn!(serializedState);

        expect(extract).toHaveBeenCalledWith({
          type: 'search',
          attributes: serializedState.attributes,
        });
        expect(result.state as StoredSearchEmbeddableByValueState).toEqual(serializedState);
        expect(result.references).toEqual([]);
        expect(transformEnhancementsIn).not.toHaveBeenCalled();
      });

      it('handles by-value state with enhancements', () => {
        const serializedState: SearchEmbeddableByValueState = {
          attributes: {
            title: 'Test Search',
            description: 'Test Description',
            columns: [],
            sort: [],
            grid: {},
            hideChart: false,
            isTextBasedQuery: false,
            kibanaSavedObjectMeta: {
              searchSourceJSON: '{}',
            },
            tabs: [],
            references: [],
          },
          enhancements: {
            dynamicActions: { events: [] },
          },
        };

        const result = getSearchEmbeddableTransforms(
          transformEnhancementsIn,
          transformEnhancementsOut
        ).transformIn!(serializedState);

        expect(result.references).toEqual([]);
        expect(transformEnhancementsIn).toHaveBeenCalledWith({
          dynamicActions: { events: [] },
        });
        expect(extract).toHaveBeenCalledWith({
          type: 'search',
          attributes: serializedState.attributes,
        });
      });
    });
  });
});
