/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

jest.mock('./pit_params');
jest.mock('./query_params');
jest.mock('./sorting_params');

import { typeRegistryMock } from '@kbn/core-saved-objects-base-server-mocks';
import * as pitParamsNS from './pit_params';
import * as queryParamsNS from './query_params';
import { getSearchDsl } from './search_dsl';
import * as sortParamsNS from './sorting_params';

const getPitParams = pitParamsNS.getPitParams as jest.Mock;
const getQueryParams = queryParamsNS.getQueryParams as jest.Mock;
const getSortingParams = sortParamsNS.getSortingParams as jest.Mock;

const registry = typeRegistryMock.create();
const mappings = { properties: {} };

describe('getSearchDsl', () => {
  afterEach(() => {
    getQueryParams.mockReset();
    getSortingParams.mockReset();
  });

  describe('validation', () => {
    it('throws when type is not specified', () => {
      expect(() => {
        getSearchDsl(mappings, registry, {
          type: undefined as any,
          sortField: 'title',
        });
      }).toThrowError(/type must be specified/);
    });
    it('throws when sortOrder without sortField', () => {
      expect(() => {
        getSearchDsl(mappings, registry, {
          type: 'foo',
          sortOrder: 'desc',
        });
      }).toThrowError(/sortOrder requires a sortField/);
    });
  });

  describe('passes control', () => {
    it('passes (mappings, schema, namespaces, type, typeToNamespacesMap, search, searchFields, rootSearchFields, hasReference, hasReferenceOperator, hasNoReference, hasNoReferenceOperator) to getQueryParams', () => {
      const opts = {
        namespaces: ['foo-namespace'],
        type: 'foo',
        typeToNamespacesMap: new Map(),
        search: 'bar',
        searchFields: ['baz'],
        rootSearchFields: ['qux'],
        defaultSearchOperator: 'AND' as queryParamsNS.SearchOperator,
        hasReference: {
          type: 'bar',
          id: '1',
        },
        hasReferenceOperator: 'AND' as queryParamsNS.SearchOperator,
        hasNoReference: {
          type: 'noBar',
          id: '1',
        },
        hasNoReferenceOperator: 'AND' as queryParamsNS.SearchOperator,
      };

      getSearchDsl(mappings, registry, opts);
      expect(getQueryParams).toHaveBeenCalledTimes(1);
      expect(getQueryParams).toHaveBeenCalledWith({
        registry,
        namespaces: opts.namespaces,
        type: opts.type,
        typeToNamespacesMap: opts.typeToNamespacesMap,
        search: opts.search,
        searchFields: opts.searchFields,
        rootSearchFields: opts.rootSearchFields,
        defaultSearchOperator: opts.defaultSearchOperator,
        hasReference: opts.hasReference,
        hasReferenceOperator: opts.hasReferenceOperator,
        hasNoReference: opts.hasNoReference,
        hasNoReferenceOperator: opts.hasNoReferenceOperator,
      });
    });

    it('passes (mappings, type, sortField, sortOrder) to getSortingParams', () => {
      getSortingParams.mockReturnValue({});
      const opts = {
        type: 'foo',
        sortField: 'bar',
        sortOrder: 'asc' as const,
        pit: { id: 'abc123' },
      };

      getSearchDsl(mappings, registry, opts);
      expect(getSortingParams).toHaveBeenCalledTimes(1);
      expect(getSortingParams).toHaveBeenCalledWith(
        mappings,
        opts.type,
        opts.sortField,
        opts.sortOrder,
        opts.pit
      );
    });

    it('returns combination of getQueryParams and getSortingParams', () => {
      getQueryParams.mockReturnValue({ a: 'a' });
      getSortingParams.mockReturnValue({ b: 'b' });
      expect(getSearchDsl(mappings, registry, { type: 'foo' })).toEqual({ a: 'a', b: 'b' });
    });

    it('returns searchAfter if provided', () => {
      getQueryParams.mockReturnValue({ a: 'a' });
      getSortingParams.mockReturnValue({ b: 'b' });
      expect(getSearchDsl(mappings, registry, { type: 'foo', searchAfter: ['1', 'bar'] })).toEqual({
        a: 'a',
        b: 'b',
        search_after: ['1', 'bar'],
      });
    });

    it('returns pit if provided', () => {
      getQueryParams.mockReturnValue({ a: 'a' });
      getSortingParams.mockReturnValue({ b: 'b' });
      getPitParams.mockReturnValue({ pit: { id: 'abc123' } });
      expect(
        getSearchDsl(mappings, registry, {
          type: 'foo',
          searchAfter: ['1', 'bar'],
          pit: { id: 'abc123' },
        })
      ).toEqual({
        a: 'a',
        b: 'b',
        pit: { id: 'abc123' },
        search_after: ['1', 'bar'],
      });
    });
  });
});
