/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { injectSavedObjectIdRef, extractSavedObjectIdRef } from './saved_object_id_references';
import type { SavedObjectReference } from '@kbn/core/server';
import type { EmbeddableStateWithType } from '../types';

describe('saved_object_id_references', () => {
  describe('injectSavedObjectIdRef', () => {
    it('should inject savedObjectId into state if reference is found', () => {
      const state: EmbeddableStateWithType = { id: 'foo', type: 'testType' };
      const references: SavedObjectReference[] = [
        { name: 'panel_foo', type: 'testType', id: 'savedObjectId1' },
      ];

      const result = injectSavedObjectIdRef(state, references);

      expect(result).toEqual({
        ...state,
        savedObjectId: 'savedObjectId1',
      });
    });

    it('should throw an error if no reference is found', () => {
      const state: EmbeddableStateWithType = { id: 'foo', type: 'testType' };
      const references: SavedObjectReference[] = [
        { name: 'panel_bar', type: 'testType', id: 'savedObjectId2' },
      ];

      expect(() => injectSavedObjectIdRef(state, references)).toThrowErrorMatchingInlineSnapshot(
        `"Could not find reference \\"panel_foo\\""`
      );
    });
  });

  describe('extractSavedObjectIdRef', () => {
    it('should extract savedObjectId from state and add it to references', () => {
      const state: EmbeddableStateWithType & { savedObjectId: string } = {
        id: 'bizz',
        type: 'testType',
        savedObjectId: 'savedObjectId1',
      };
      const references: SavedObjectReference[] = [];

      const result = extractSavedObjectIdRef(state, references);

      expect(result.state).toEqual({
        ...state,
        savedObjectId: undefined,
      });
      expect(result.references).toEqual([
        { name: 'panel_bizz', type: 'testType', id: 'savedObjectId1' },
      ]);
    });

    it('should return state unchanged if no savedObjectId is present', () => {
      const state: EmbeddableStateWithType = { id: 'bizz', type: 'testType' };
      const references: SavedObjectReference[] = [];

      const result = extractSavedObjectIdRef(state, references);

      expect(result.state).toEqual(state);
      expect(result.references).toEqual([]);
    });
  });
});
