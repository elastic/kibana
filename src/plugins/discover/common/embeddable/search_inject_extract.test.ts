/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedSearchByValueAttributes } from '@kbn/saved-search-plugin/public';
import { extract, inject } from './search_inject_extract';

describe('search inject extract', () => {
  describe('inject', () => {
    it('should not inject references if state does not have attributes', () => {
      const state = { type: 'type', id: 'id' };
      const injectedReferences = [{ name: 'name', type: 'type', id: 'id' }];
      expect(inject(state, injectedReferences)).toEqual(state);
    });

    it('should inject references if state has references with the same name', () => {
      const state = {
        type: 'type',
        id: 'id',
        attributes: {
          references: [{ name: 'name', type: 'type', id: '1' }],
        },
      };
      const injectedReferences = [{ name: 'name', type: 'type', id: '2' }];
      expect(inject(state, injectedReferences)).toEqual({
        ...state,
        attributes: {
          ...state.attributes,
          references: injectedReferences,
        },
      });
    });

    it('should clear references if state has no references with the same name', () => {
      const state = {
        type: 'type',
        id: 'id',
        attributes: {
          references: [{ name: 'name', type: 'type', id: '1' }],
        },
      };
      const injectedReferences = [{ name: 'other', type: 'type', id: '2' }];
      expect(inject(state, injectedReferences)).toEqual({
        ...state,
        attributes: {
          ...state.attributes,
          references: [],
        },
      });
    });
  });

  describe('extract', () => {
    it('should not extract references if state does not have attributes', () => {
      const state = { type: 'type', id: 'id' };
      expect(extract(state)).toEqual({ state, references: [] });
    });

    it('should extract references if state has references', () => {
      const state = {
        type: 'type',
        id: 'id',
        attributes: {
          references: [{ name: 'name', type: 'type', id: '1' }],
        } as SavedSearchByValueAttributes,
      };
      expect(extract(state)).toEqual({
        state,
        references: [{ name: 'name', type: 'type', id: '1' }],
      });
    });
  });
});
