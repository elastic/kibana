/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getReferencesFilterMock } from './query_params.tests.mocks';

import * as esKuery from '@kbn/es-query';

type KueryNode = any;

import { ALL_NAMESPACES_STRING, DEFAULT_NAMESPACE_STRING } from '../utils';
import { SavedObjectTypeRegistry } from '../../../saved_objects_type_registry';
import { getQueryParams } from './query_params';

const registerTypes = (registry: SavedObjectTypeRegistry) => {
  registry.registerType({
    name: 'pending',
    hidden: false,
    namespaceType: 'single',
    mappings: {
      properties: { title: { type: 'text' } },
    },
    management: {
      defaultSearchField: 'title',
    },
  });

  registry.registerType({
    name: 'saved',
    hidden: false,
    namespaceType: 'single',
    mappings: {
      properties: {
        title: { type: 'text', fields: { raw: { type: 'keyword' } } },
        obj: { properties: { key1: { type: 'text' } } },
      },
    },
    management: {
      defaultSearchField: 'title',
    },
  });

  registry.registerType({
    name: 'shared',
    hidden: false,
    namespaceType: 'multiple',
    mappings: {
      properties: { name: { type: 'keyword' } },
    },
    management: {
      defaultSearchField: 'name',
    },
  });

  registry.registerType({
    name: 'global',
    hidden: false,
    namespaceType: 'agnostic',
    mappings: {
      properties: { name: { type: 'keyword' } },
    },
    management: {
      defaultSearchField: 'name',
    },
  });
};

const ALL_TYPES = ['pending', 'saved', 'shared', 'global'];
// get all possible subsets (combination) of all types
const ALL_TYPE_SUBSETS = ALL_TYPES.reduce(
  (subsets, value) => subsets.concat(subsets.map((set) => [...set, value])),
  [[] as string[]]
)
  .filter((x) => x.length) // exclude empty set
  .map((x) => (x.length === 1 ? x[0] : x)); // if a subset is a single string, destructure it

/**
 * Note: these tests cases are defined in the order they appear in the source code, for readability's sake
 */
describe('#getQueryParams', () => {
  let registry: SavedObjectTypeRegistry;
  type Result = ReturnType<typeof getQueryParams>;

  beforeEach(() => {
    registry = new SavedObjectTypeRegistry();
    registerTypes(registry);

    getReferencesFilterMock.mockReturnValue({ references_filter: true });
  });

  afterEach(() => {
    getReferencesFilterMock.mockClear();
  });

  const createTypeClause = (type: string, namespaces?: string[]) => {
    if (registry.isMultiNamespace(type)) {
      const array = [...(namespaces ?? [DEFAULT_NAMESPACE_STRING]), ALL_NAMESPACES_STRING];

      return {
        bool: {
          must: namespaces?.includes(ALL_NAMESPACES_STRING)
            ? [{ term: { type } }]
            : [{ term: { type } }, { terms: { namespaces: array } }],
          must_not: [{ exists: { field: 'namespace' } }],
        },
      };
    } else if (registry.isSingleNamespace(type)) {
      const nonDefaultNamespaces = namespaces?.filter((n) => n !== DEFAULT_NAMESPACE_STRING) ?? [];
      const searchingAcrossAllNamespaces = namespaces?.includes(ALL_NAMESPACES_STRING) ?? false;
      const should: any = [];
      if (nonDefaultNamespaces.length > 0 && !searchingAcrossAllNamespaces) {
        should.push({ terms: { namespace: nonDefaultNamespaces } });
      }
      if (namespaces?.includes(DEFAULT_NAMESPACE_STRING)) {
        should.push({ bool: { must_not: [{ exists: { field: 'namespace' } }] } });
      }
      return {
        bool: {
          must: [{ term: { type } }],
          should: expect.arrayContaining(should),
          minimum_should_match: 1,
          must_not: [{ exists: { field: 'namespaces' } }],
        },
      };
    }
    // isNamespaceAgnostic
    return {
      bool: expect.objectContaining({
        must_not: [{ exists: { field: 'namespace' } }, { exists: { field: 'namespaces' } }],
      }),
    };
  };

  describe('kueryNode filter clause', () => {
    const expectResult = (result: Result, expected: any) => {
      expect(result.query.bool.filter).toEqual(expect.arrayContaining([expected]));
    };

    describe('`kueryNode` parameter', () => {
      it('does not include the clause when `kueryNode` is not specified', () => {
        const result = getQueryParams({ registry, kueryNode: undefined });
        expect(result.query.bool.filter).toHaveLength(1);
      });

      it('includes the specified Kuery clause', () => {
        const test = (kueryNode: KueryNode) => {
          const result = getQueryParams({ registry, kueryNode });
          const expected = esKuery.toElasticsearchQuery(kueryNode);
          expect(result.query.bool.filter).toHaveLength(2);
          expectResult(result, expected);
        };

        const simpleClause = {
          type: 'function',
          function: 'is',
          arguments: [
            { type: 'literal', value: 'global.name' },
            { type: 'literal', value: 'GLOBAL' },
            { type: 'literal', value: false },
          ],
        } as KueryNode;
        test(simpleClause);

        const complexClause = {
          type: 'function',
          function: 'and',
          arguments: [
            simpleClause,
            {
              type: 'function',
              function: 'not',
              arguments: [
                {
                  type: 'function',
                  function: 'is',
                  arguments: [
                    { type: 'literal', value: 'saved.obj.key1' },
                    { type: 'literal', value: 'key' },
                    { type: 'literal', value: true },
                  ],
                },
              ],
            },
          ],
        } as KueryNode;
        test(complexClause);
      });
    });
  });

  describe('reference filter clause', () => {
    describe('`hasReference` parameter', () => {
      it('does not call `getReferencesFilter` when `hasReference` is not specified', () => {
        getQueryParams({
          registry,
          hasReference: undefined,
        });

        expect(getReferencesFilterMock).not.toHaveBeenCalled();
      });

      it('calls `getReferencesFilter` with the correct parameters', () => {
        const hasReference = { id: 'foo', type: 'bar' };
        getQueryParams({
          registry,
          hasReference,
          hasReferenceOperator: 'AND',
        });

        expect(getReferencesFilterMock).toHaveBeenCalledTimes(1);
        expect(getReferencesFilterMock).toHaveBeenCalledWith({
          references: [hasReference],
          operator: 'AND',
        });
      });

      it('includes the return of `getReferencesFilter` in the `filter` clause', () => {
        getReferencesFilterMock.mockReturnValue({ references_filter: true });

        const hasReference = { id: 'foo', type: 'bar' };
        const result = getQueryParams({
          registry,
          hasReference,
          hasReferenceOperator: 'AND',
        });

        const filters: any[] = result.query.bool.filter;
        expect(filters.some((filter) => filter.references_filter === true)).toBeDefined();
      });
    });
  });

  describe('type filter clauses', () => {
    describe('`type` parameter', () => {
      const expectResult = (result: Result, ...types: string[]) => {
        expect(result.query.bool.filter).toEqual(
          expect.arrayContaining([
            {
              bool: expect.objectContaining({
                should: types.map((type) => ({
                  bool: expect.objectContaining({
                    must: expect.arrayContaining([{ term: { type } }]),
                  }),
                })),
                minimum_should_match: 1,
              }),
            },
          ])
        );
      };

      it('searches for all known types when `type` is not specified', () => {
        const result = getQueryParams({ registry, type: undefined });
        expectResult(result, ...ALL_TYPES);
      });

      it('searches for specified type/s', () => {
        const test = (typeOrTypes: string | string[]) => {
          const result = getQueryParams({
            registry,
            type: typeOrTypes,
          });
          const type = Array.isArray(typeOrTypes) ? typeOrTypes : [typeOrTypes];
          expectResult(result, ...type);
        };
        for (const typeOrTypes of ALL_TYPE_SUBSETS) {
          test(typeOrTypes);
        }
      });
    });

    describe('`namespaces` parameter', () => {
      const expectResult = (result: Result, ...typeClauses: any) => {
        expect(result.query.bool.filter).toEqual(
          expect.arrayContaining([
            { bool: expect.objectContaining({ should: typeClauses, minimum_should_match: 1 }) },
          ])
        );
      };

      const test = (namespaces?: string[]) => {
        for (const typeOrTypes of ALL_TYPE_SUBSETS) {
          const result = getQueryParams({ registry, type: typeOrTypes, namespaces });
          const types = Array.isArray(typeOrTypes) ? typeOrTypes : [typeOrTypes];
          expectResult(result, ...types.map((x) => createTypeClause(x, namespaces)));
        }
        // also test with no specified type/s
        const result = getQueryParams({ registry, type: undefined, namespaces });
        expectResult(result, ...ALL_TYPES.map((x) => createTypeClause(x, namespaces)));
      };

      it('deduplicates provided namespaces', () => {
        const result = getQueryParams({
          registry,
          search: '*',
          namespaces: ['foo', '*', 'foo', 'bar', 'default'],
        });

        expectResult(
          result,
          ...ALL_TYPES.map((x) => createTypeClause(x, ['foo', '*', 'bar', 'default']))
        );
      });

      it('filters results with "namespace" field when `namespaces` is not specified', () => {
        test(undefined);
      });

      it('filters results for specified namespace for appropriate type/s', () => {
        test(['foo-namespace']);
      });

      it('filters results for specified namespaces for appropriate type/s', () => {
        test(['foo-namespace', 'default']);
      });

      it('filters results for specified `default` namespace for appropriate type/s', () => {
        test(['default']);
      });
    });

    describe('`typeToNamespacesMap` parameter', () => {
      const expectResult = (result: Result, ...typeClauses: any) => {
        expect(result.query.bool.filter).toEqual(
          expect.arrayContaining([
            { bool: expect.objectContaining({ should: typeClauses, minimum_should_match: 1 }) },
          ])
        );
      };

      it('supersedes `type` and `namespaces` parameters', () => {
        const result = getQueryParams({
          registry,
          type: ['pending', 'saved', 'shared', 'global'],
          namespaces: ['foo', 'bar', 'default'],
          typeToNamespacesMap: new Map([
            ['pending', ['foo']], // 'pending' is only authorized in the 'foo' namespace
            // 'saved' is not authorized in any namespaces
            ['shared', ['bar', 'default']], // 'shared' is only authorized in the 'bar' and 'default' namespaces
            ['global', ['foo', 'bar', 'default']], // 'global' is authorized in all namespaces (which are ignored anyway)
          ]),
        });
        expectResult(
          result,
          createTypeClause('pending', ['foo']),
          createTypeClause('shared', ['bar', 'default']),
          createTypeClause('global')
        );
      });
    });
  });

  describe('search clause (query.bool)', () => {
    describe('when using simple search (query.bool.must.simple_query_string)', () => {
      const search = 'foo';

      const expectResult = (result: Result, sqsClause: any) => {
        expect(result.query.bool.must).toEqual([{ simple_query_string: sqsClause }]);
      };

      describe('`search` parameter', () => {
        it('does not include clause when `search` is not specified', () => {
          const result = getQueryParams({
            registry,
            search: undefined,
          });
          expect(result.query.bool.must).toBeUndefined();
        });

        it('creates a clause with query for specified search', () => {
          const result = getQueryParams({
            registry,
            search,
          });
          expectResult(result, expect.objectContaining({ query: search }));
        });
      });

      describe('`searchFields` and `rootSearchFields` parameters', () => {
        const getExpectedFields = (searchFields: string[], typeOrTypes: string | string[]) => {
          const types = Array.isArray(typeOrTypes) ? typeOrTypes : [typeOrTypes];
          return searchFields.map((x) => types.map((y) => `${y}.${x}`)).flat();
        };

        const test = ({
          searchFields,
          rootSearchFields,
        }: {
          searchFields?: string[];
          rootSearchFields?: string[];
        }) => {
          for (const typeOrTypes of ALL_TYPE_SUBSETS) {
            const result = getQueryParams({
              registry,
              type: typeOrTypes,
              search,
              searchFields,
              rootSearchFields,
            });
            let fields = rootSearchFields || [];
            if (searchFields) {
              fields = fields.concat(getExpectedFields(searchFields, typeOrTypes));
            }
            expectResult(result, expect.objectContaining({ fields }));
          }
          // also test with no specified type/s
          const result = getQueryParams({
            registry,
            type: undefined,
            search,
            searchFields,
            rootSearchFields,
          });
          let fields = rootSearchFields || [];
          if (searchFields) {
            fields = fields.concat(getExpectedFields(searchFields, ALL_TYPES));
          }
          expectResult(result, expect.objectContaining({ fields }));
        };

        it('throws an error if a raw search field contains a "." character', () => {
          expect(() =>
            getQueryParams({
              registry,
              type: undefined,
              search,
              searchFields: undefined,
              rootSearchFields: ['foo', 'bar.baz'],
            })
          ).toThrowErrorMatchingInlineSnapshot(
            `"rootSearchFields entry \\"bar.baz\\" is invalid: cannot contain \\".\\" character"`
          );
        });

        it('includes lenient flag and all fields when `searchFields` and `rootSearchFields` are not specified', () => {
          const result = getQueryParams({
            registry,
            search,
            searchFields: undefined,
            rootSearchFields: undefined,
          });
          expectResult(result, expect.objectContaining({ lenient: true, fields: ['*'] }));
        });

        it('includes specified search fields for appropriate type/s', () => {
          test({ searchFields: ['title'] });
        });

        it('supports boosting', () => {
          test({ searchFields: ['title^3'] });
        });

        it('supports multiple search fields', () => {
          test({ searchFields: ['title, title.raw'] });
        });

        it('includes specified raw search fields', () => {
          test({ rootSearchFields: ['_id'] });
        });

        it('supports multiple raw search fields', () => {
          test({ rootSearchFields: ['_id', 'originId'] });
        });

        it('supports search fields and raw search fields', () => {
          test({ searchFields: ['title'], rootSearchFields: ['_id'] });
        });
      });

      describe('`defaultSearchOperator` parameter', () => {
        it('does not include default_operator when `defaultSearchOperator` is not specified', () => {
          const result = getQueryParams({
            registry,
            search,
            defaultSearchOperator: undefined,
          });
          expectResult(
            result,
            expect.not.objectContaining({ default_operator: expect.anything() })
          );
        });

        it('includes specified default operator', () => {
          const defaultSearchOperator = 'AND';
          const result = getQueryParams({
            registry,
            search,
            defaultSearchOperator,
          });
          expectResult(
            result,
            expect.objectContaining({ default_operator: defaultSearchOperator })
          );
        });
      });
    });

    describe('when using prefix search (query.bool.should)', () => {
      const searchQuery = 'foo*';

      const getQueryParamForSearch = ({
        search,
        searchFields,
        type,
      }: {
        search?: string;
        searchFields?: string[];
        type?: string[];
      }) =>
        getQueryParams({
          registry,
          search,
          searchFields,
          type,
        });

      it('uses a `should` clause instead of `must`', () => {
        const result = getQueryParamForSearch({ search: searchQuery, searchFields: ['title'] });

        expect(result.query.bool.must).toBeUndefined();
        expect(result.query.bool.should).toEqual(expect.any(Array));
        expect(result.query.bool.should.length).toBeGreaterThanOrEqual(1);
        expect(result.query.bool.minimum_should_match).toBe(1);
      });
      it('includes the `simple_query_string` in the `should` clauses', () => {
        const result = getQueryParamForSearch({ search: searchQuery, searchFields: ['title'] });
        expect(result.query.bool.should[0]).toEqual({
          simple_query_string: expect.objectContaining({
            query: searchQuery,
          }),
        });
      });

      it('adds a should clause for each `searchFields` / `type` tuple', () => {
        const result = getQueryParamForSearch({
          search: searchQuery,
          searchFields: ['title', 'desc'],
          type: ['saved', 'pending'],
        });
        const shouldClauses = result.query.bool.should;

        expect(shouldClauses.length).toBe(5);

        const mppClauses = shouldClauses.slice(1);

        expect(mppClauses.map((clause: any) => Object.keys(clause.match_phrase_prefix)[0])).toEqual(
          ['saved.title', 'pending.title', 'saved.desc', 'pending.desc']
        );
      });

      it('uses all registered types when `type` is not provided', () => {
        const result = getQueryParamForSearch({
          search: searchQuery,
          searchFields: ['title'],
          type: undefined,
        });
        const shouldClauses = result.query.bool.should;

        expect(shouldClauses.length).toBe(5);

        const mppClauses = shouldClauses.slice(1);

        expect(mppClauses.map((clause: any) => Object.keys(clause.match_phrase_prefix)[0])).toEqual(
          ['pending.title', 'saved.title', 'shared.title', 'global.title']
        );
      });

      it('removes the prefix search wildcard from the query', () => {
        const result = getQueryParamForSearch({
          search: searchQuery,
          searchFields: ['title'],
          type: ['saved'],
        });
        const shouldClauses = result.query.bool.should;
        const mppClauses = shouldClauses.slice(1);

        expect(mppClauses[0].match_phrase_prefix['saved.title'].query).toEqual('foo');
      });

      it("defaults to the type's default search field when `searchFields` is not specified", () => {
        const result = getQueryParamForSearch({
          search: searchQuery,
          searchFields: undefined,
          type: ['saved', 'global'],
        });
        const shouldClauses = result.query.bool.should;

        expect(shouldClauses.length).toBe(3);

        const mppClauses = shouldClauses.slice(1);

        expect(mppClauses.map((clause: any) => Object.keys(clause.match_phrase_prefix)[0])).toEqual(
          ['saved.title', 'global.name']
        );
      });

      it('supports boosting', () => {
        const result = getQueryParamForSearch({
          search: searchQuery,
          searchFields: ['title^3', 'description'],
          type: ['saved'],
        });
        const shouldClauses = result.query.bool.should;

        expect(shouldClauses.length).toBe(3);

        const mppClauses = shouldClauses.slice(1);

        expect(mppClauses.map((clause: any) => clause.match_phrase_prefix)).toEqual([
          { 'saved.title': { query: 'foo', boost: 3 } },
          { 'saved.description': { query: 'foo', boost: 1 } },
        ]);
      });
    });
  });

  describe('namespaces property', () => {
    ALL_TYPES.forEach((type) => {
      it(`throws for ${type} when namespaces is an empty array`, () => {
        expect(() =>
          getQueryParams({
            registry,
            namespaces: [],
          })
        ).toThrowError('cannot specify empty namespaces array');
      });
    });
  });
});
