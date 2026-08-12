/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
const getNamespacesBoolFilter = queryParamsNS.getNamespacesBoolFilter as jest.Mock;
const getSemanticClause = queryParamsNS.getSemanticClause as jest.Mock;
const getSortingParams = sortParamsNS.getSortingParams as jest.Mock;

const registry = typeRegistryMock.create();
const mappings = { properties: {} };

/**
 * Recursively walks the retriever tree (standard + rrf leaves) and returns the `query` object
 * from every standard-retriever leaf. Used by the S5 invariant test to verify the namespace/type
 * filter is present in every leaf regardless of tree depth.
 *
 * Throws for any unrecognized retriever node type so that a future addition of a new leaf kind
 * (e.g. `knn`, `linear`) causes a clear failure rather than silently bypassing the invariant check.
 */
const collectLeafQueries = (retriever: any): any[] => {
  if (retriever.standard) {
    return [retriever.standard.query];
  }
  if (retriever.rrf && Array.isArray(retriever.rrf.retrievers)) {
    return retriever.rrf.retrievers.flatMap((entry: any) => {
      // RRFRetrieverComponent wraps the child in a `retriever` key; plain RetrieverContainer does not.
      return collectLeafQueries(entry.retriever ?? entry);
    });
  }
  throw new Error(
    `collectLeafQueries: unrecognized retriever node type — keys: [${Object.keys(retriever).join(
      ', '
    )}]. Extend this helper to handle the new node type and verify the namespace filter is applied.`
  );
};

describe('getSearchDsl', () => {
  afterEach(() => {
    getQueryParams.mockReset();
    getSortingParams.mockReset();
    getNamespacesBoolFilter.mockReset();
    getSemanticClause.mockReset();
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
        mappings,
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

  // ─── semanticSearch option ─────────────────────────────────────────────────

  describe('semanticSearch', () => {
    // A concrete namespace/type filter shape used as the mock return value for
    // getNamespacesBoolFilter so the leaf-walking assertion can check for it by identity.
    const mockNsTypeFilter = {
      bool: {
        should: [{ bool: { must: [{ term: { type: 'mytype' } }] } }],
        minimum_should_match: 1,
      },
    };
    // A concrete semantic clause returned by the mocked getSemanticClause.
    const mockSemanticClause = {
      bool: {
        should: [{ semantic: { field: 'mytype.title_semantic', query: 'find me' } }],
        minimum_should_match: 1,
      },
    };
    // A BM25 query that already embeds the namespace filter (as getQueryParams does in production).
    const mockBm25Query = {
      bool: {
        filter: [mockNsTypeFilter],
        must: [{ simple_query_string: { query: 'find me', fields: ['*'] } }],
      },
    };

    beforeEach(() => {
      getNamespacesBoolFilter.mockReturnValue(mockNsTypeFilter);
      getSemanticClause.mockReturnValue(mockSemanticClause);
      getQueryParams.mockReturnValue({ query: mockBm25Query });
      getSortingParams.mockReturnValue({});
    });

    describe('non-semantic path is unchanged when semanticSearch is absent', () => {
      it('does not call getNamespacesBoolFilter or getSemanticClause', () => {
        getSearchDsl(mappings, registry, { type: 'mytype' });
        expect(getNamespacesBoolFilter).not.toHaveBeenCalled();
        expect(getSemanticClause).not.toHaveBeenCalled();
      });

      it('calls getQueryParams and getSortingParams as before', () => {
        getSearchDsl(mappings, registry, { type: 'mytype' });
        expect(getQueryParams).toHaveBeenCalledTimes(1);
        expect(getSortingParams).toHaveBeenCalledTimes(1);
      });
    });

    describe('mode: semantic', () => {
      const semanticOpts = {
        type: 'mytype',
        namespaces: ['default'],
        semanticSearch: { query: 'find me', mode: 'semantic' as const },
      };

      it('returns a retriever instead of a bare query', () => {
        const result = getSearchDsl(mappings, registry, semanticOpts) as any;
        expect(result.retriever).toBeDefined();
        expect(result.query).toBeUndefined();
      });

      it('emits a standard retriever wrapping the semantic clause', () => {
        const result = getSearchDsl(mappings, registry, semanticOpts) as any;
        expect(result.retriever.standard).toBeDefined();
        expect(result.retriever.standard.query.bool.must).toContainEqual(mockSemanticClause);
      });

      it('does not include top-level sort or search_after', () => {
        const result = getSearchDsl(mappings, registry, semanticOpts) as any;
        expect(result.sort).toBeUndefined();
        expect(result.search_after).toBeUndefined();
      });

      it('does not call getQueryParams for the BM25 query in semantic-only mode', () => {
        getSearchDsl(mappings, registry, semanticOpts);
        expect(getQueryParams).not.toHaveBeenCalled();
      });

      it('calls getSemanticClause with the correct arguments', () => {
        getSearchDsl(mappings, registry, semanticOpts);
        expect(getSemanticClause).toHaveBeenCalledWith(registry, ['mytype'], 'find me', undefined);
      });

      // ── S5 LEAF-WALKING TEST (semantic mode) ──────────────────────────────
      // Walks the retriever tree and asserts the namespace/type bool filter appears in EVERY
      // leaf.  This test must fail if a future change adds an unfiltered leaf.
      it('(S5) namespace/type filter is present in every leaf (semantic mode)', () => {
        const result = getSearchDsl(mappings, registry, semanticOpts) as any;
        const leafQueries = collectLeafQueries(result.retriever);
        expect(leafQueries.length).toBeGreaterThan(0);
        for (const query of leafQueries) {
          const filter: unknown[] = Array.isArray(query?.bool?.filter)
            ? query.bool.filter
            : [query?.bool?.filter];
          expect(filter).toContainEqual(mockNsTypeFilter);
        }
      });
    });

    describe('mode: hybrid (default)', () => {
      const hybridOpts = {
        type: 'mytype',
        namespaces: ['default'],
        semanticSearch: { query: 'find me' }, // mode omitted → defaults to 'hybrid'
      };

      it('returns a retriever instead of a bare query', () => {
        const result = getSearchDsl(mappings, registry, hybridOpts) as any;
        expect(result.retriever).toBeDefined();
        expect(result.query).toBeUndefined();
      });

      it('emits an rrf retriever with two leaves', () => {
        const result = getSearchDsl(mappings, registry, hybridOpts) as any;
        expect(result.retriever.rrf).toBeDefined();
        expect(result.retriever.rrf.retrievers).toHaveLength(2);
      });

      it('applies default rank_window_size (100) and rank_constant (60)', () => {
        const result = getSearchDsl(mappings, registry, hybridOpts) as any;
        expect(result.retriever.rrf.rank_window_size).toBe(100);
        expect(result.retriever.rrf.rank_constant).toBe(60);
      });

      it('respects caller-supplied rankWindowSize and rankConstant', () => {
        const result = getSearchDsl(mappings, registry, {
          ...hybridOpts,
          semanticSearch: { query: 'find me', rankWindowSize: 500, rankConstant: 20 },
        }) as any;
        expect(result.retriever.rrf.rank_window_size).toBe(500);
        expect(result.retriever.rrf.rank_constant).toBe(20);
      });

      it('does not include top-level sort or search_after', () => {
        const result = getSearchDsl(mappings, registry, hybridOpts) as any;
        expect(result.sort).toBeUndefined();
        expect(result.search_after).toBeUndefined();
      });

      it('calls getQueryParams once for the BM25 leaf', () => {
        getSearchDsl(mappings, registry, hybridOpts);
        expect(getQueryParams).toHaveBeenCalledTimes(1);
      });

      it('calls getSemanticClause with the correct arguments', () => {
        getSearchDsl(mappings, registry, {
          ...hybridOpts,
          semanticSearch: { query: 'find me', fields: ['title'] },
        });
        expect(getSemanticClause).toHaveBeenCalledWith(registry, ['mytype'], 'find me', ['title']);
      });

      it('wraps the BM25 query (including its embedded nsTypeFilter) in the first leaf', () => {
        const result = getSearchDsl(mappings, registry, hybridOpts) as any;
        const bm25Leaf = result.retriever.rrf.retrievers[0];
        expect(bm25Leaf.standard.query).toEqual(mockBm25Query);
      });

      it('puts the semantic clause in the second leaf', () => {
        const result = getSearchDsl(mappings, registry, hybridOpts) as any;
        const semanticLeaf = result.retriever.rrf.retrievers[1];
        expect(semanticLeaf.standard.query.bool.must).toContainEqual(mockSemanticClause);
      });

      // ── S5 LEAF-WALKING TEST (hybrid mode) ────────────────────────────────
      // Recursively walks the rrf retriever tree and asserts the namespace/type bool filter
      // is present in EVERY leaf independently.  If a future change adds an unfiltered leaf
      // (e.g. a third retriever without the filter), this test must fail loudly.
      it('(S5) namespace/type filter is present in every leaf (hybrid mode)', () => {
        const result = getSearchDsl(mappings, registry, hybridOpts) as any;
        const leafQueries = collectLeafQueries(result.retriever);
        expect(leafQueries).toHaveLength(2);
        for (const query of leafQueries) {
          const filter: unknown[] = Array.isArray(query?.bool?.filter)
            ? query.bool.filter
            : [query?.bool?.filter];
          expect(filter).toContainEqual(mockNsTypeFilter);
        }
      });

      it('(S5) leaf-walking test fails when a leaf lacks the nsTypeFilter', () => {
        // Sanity-check that the helper actually detects a missing filter.
        const fakeResult = {
          retriever: {
            rrf: {
              retrievers: [
                { standard: { query: { bool: { filter: [mockNsTypeFilter] } } } },
                // Second leaf intentionally has NO filter.
                { standard: { query: { bool: {} } } },
              ],
            },
          },
        };
        const leafQueries = collectLeafQueries(fakeResult.retriever);
        const allFiltered = leafQueries.every((query) => {
          const f: unknown[] = Array.isArray(query?.bool?.filter)
            ? query.bool.filter
            : [query?.bool?.filter];
          return f.includes(mockNsTypeFilter);
        });
        expect(allFiltered).toBe(false);
      });

      it('(S5) leaf-walker throws on an unrecognized retriever node type (fail-closed guard)', () => {
        // Proves that adding a new retriever kind (e.g. `knn`, `linear`) does NOT silently bypass
        // the invariant — the helper throws so the developer must explicitly handle and verify it.
        const unknownRetriever = { knn: { field: 'some_vector', num_candidates: 100 } };
        expect(() => collectLeafQueries(unknownRetriever)).toThrow(
          /unrecognized retriever node type.*knn/
        );
      });

      describe('with multiple namespaces', () => {
        it('passes namespaces to getNamespacesBoolFilter', () => {
          const multiNsOpts = {
            type: 'mytype',
            namespaces: ['ns1', 'ns2'],
            semanticSearch: { query: 'q' },
          };
          getSearchDsl(mappings, registry, multiNsOpts);
          expect(getNamespacesBoolFilter).toHaveBeenCalledWith(
            expect.objectContaining({ namespaces: ['ns1', 'ns2'] })
          );
        });
      });

      describe('with typeToNamespacesMap', () => {
        it('derives the types array from typeToNamespacesMap keys', () => {
          const map = new Map([
            ['typeX', ['ns1']],
            ['typeY', ['ns2']],
          ]);
          getSearchDsl(mappings, registry, {
            type: 'ignored',
            typeToNamespacesMap: map,
            semanticSearch: { query: 'q' },
          });
          expect(getSemanticClause).toHaveBeenCalledWith(
            registry,
            expect.arrayContaining(['typeX', 'typeY']),
            'q',
            undefined
          );
        });
      });
    });
  });
});
