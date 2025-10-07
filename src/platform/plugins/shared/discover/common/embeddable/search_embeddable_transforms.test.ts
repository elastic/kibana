/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { searchEmbeddableTransforms } from './search_embeddable_transforms';
import type { SearchEmbeddableSerializedState } from '../../public';

describe('searchEmbeddableTransforms', () => {
  describe('transformOut', () => {
    it('returns the state unchanged if attributes are not present', () => {
      const state: SearchEmbeddableSerializedState = {
        title: 'Test Title',
        description: 'Test Description',
      };
      const result = searchEmbeddableTransforms.transformOut?.(state);
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
          references: [{ id: 'ref1', name: 'ref', type: 'index-pattern' }],
        },
      } as SearchEmbeddableSerializedState;
      const expectedAttributes = {
        title: 'Test Title',
        description: 'Test Description',
        references: [{ id: 'ref1', name: 'ref', type: 'index-pattern' }],
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
      const result = searchEmbeddableTransforms.transformOut?.(state);
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
      } as SearchEmbeddableSerializedState;
      const expectedAttributes = {
        tabs: [
          {
            id: expect.any(String),
            label: 'Untitled',
            attributes: {},
          },
        ],
      };
      const result = searchEmbeddableTransforms.transformOut?.(state);
      expect(result).toEqual({
        ...state,
        attributes: expectedAttributes,
      });
    });

    it('removes top-level tab attributes if tabs already present', () => {
      const state = {
        title: 'Test Title',
        description: 'Test Description',
        attributes: {
          title: 'Test Title',
          description: 'Test Description',
          tabs: [
            {
              id: 'tab-1',
              label: 'Tab 1',
              attributes: { columns: ['foo'] },
            },
          ],
          columns: ['should be removed'],
          references: [{ id: 'ref2', name: 'ref2', type: 'index-pattern' }],
        },
      } as SearchEmbeddableSerializedState;
      const expectedAttributes = {
        title: 'Test Title',
        description: 'Test Description',
        references: [{ id: 'ref2', name: 'ref2', type: 'index-pattern' }],
        tabs: [
          {
            id: 'tab-1',
            label: 'Tab 1',
            attributes: { columns: ['foo'] },
          },
        ],
      };
      const result = searchEmbeddableTransforms.transformOut?.(state);
      expect(result).toEqual({
        ...state,
        attributes: expectedAttributes,
      });
    });
  });
});
