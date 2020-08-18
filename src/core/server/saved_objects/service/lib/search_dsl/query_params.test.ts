/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { esKuery, KueryNode } from '../../../../../../plugins/data/server';

import { typeRegistryMock } from '../../../saved_objects_type_registry.mock';
import { getQueryParams } from './query_params';

const registry = typeRegistryMock.create();

const MAPPINGS = {
  properties: {
    pending: { properties: { title: { type: 'text' } } },
    saved: {
      properties: {
        title: { type: 'text', fields: { raw: { type: 'keyword' } } },
        obj: { properties: { key1: { type: 'text' } } },
      },
    },
    // mock registry returns isMultiNamespace=true for 'shared' type
    shared: { properties: { name: { type: 'keyword' } } },
    // mock registry returns isNamespaceAgnostic=true for 'global' type
    global: { properties: { name: { type: 'keyword' } } },
  },
};
const ALL_TYPES = Object.keys(MAPPINGS.properties);
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
  const mappings = MAPPINGS;
  type Result = ReturnType<typeof getQueryParams>;

  describe('kueryNode filter clause (query.bool.filter[...]', () => {
    const expectResult = (result: Result, expected: any) => {
      expect(result.query.bool.filter).toEqual(expect.arrayContaining([expected]));
    };

    describe('`kueryNode` parameter', () => {
      it('does not include the clause when `kueryNode` is not specified', () => {
        const result = getQueryParams({ mappings, registry, kueryNode: undefined });
        expect(result.query.bool.filter).toHaveLength(1);
      });

      it('includes the specified Kuery clause', () => {
        const test = (kueryNode: KueryNode) => {
          const result = getQueryParams({ mappings, registry, kueryNode });
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

  describe('reference filter clause (query.bool.filter[bool.must])', () => {
    describe('`hasReference` parameter', () => {
      const expectResult = (result: Result, expected: any) => {
        expect(result.query.bool.filter).toEqual(
          expect.arrayContaining([{ bool: expect.objectContaining({ must: expected }) }])
        );
      };

      it('does not include the clause when `hasReference` is not specified', () => {
        const result = getQueryParams({
          mappings,
          registry,
          hasReference: undefined,
        });
        expectResult(result, undefined);
      });

      it('creates a clause with query for specified reference', () => {
        const hasReference = { id: 'foo', type: 'bar' };
        const result = getQueryParams({
          mappings,
          registry,
          hasReference,
        });
        expectResult(result, [
          {
            nested: {
              path: 'references',
              query: {
                bool: {
                  must: [
                    { term: { 'references.id': hasReference.id } },
                    { term: { 'references.type': hasReference.type } },
                  ],
                },
              },
            },
          },
        ]);
      });
    });
  });

  describe('type filter clauses (query.bool.filter[bool.should])', () => {
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
        const result = getQueryParams({ mappings, registry, type: undefined });
        expectResult(result, ...ALL_TYPES);
      });

      it('searches for specified type/s', () => {
        const test = (typeOrTypes: string | string[]) => {
          const result = getQueryParams({
            mappings,
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
      const createTypeClause = (type: string, namespaces?: string[]) => {
        if (registry.isMultiNamespace(type)) {
          return {
            bool: {
              must: expect.arrayContaining([{ terms: { namespaces: namespaces ?? ['default'] } }]),
              must_not: [{ exists: { field: 'namespace' } }],
            },
          };
        } else if (registry.isSingleNamespace(type)) {
          const nonDefaultNamespaces = namespaces?.filter((n) => n !== 'default') ?? [];
          const should: any = [];
          if (nonDefaultNamespaces.length > 0) {
            should.push({ terms: { namespace: nonDefaultNamespaces } });
          }
          if (namespaces?.includes('default')) {
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

      const expectResult = (result: Result, ...typeClauses: any) => {
        expect(result.query.bool.filter).toEqual(
          expect.arrayContaining([
            { bool: expect.objectContaining({ should: typeClauses, minimum_should_match: 1 }) },
          ])
        );
      };

      const test = (namespaces?: string[]) => {
        for (const typeOrTypes of ALL_TYPE_SUBSETS) {
          const result = getQueryParams({ mappings, registry, type: typeOrTypes, namespaces });
          const types = Array.isArray(typeOrTypes) ? typeOrTypes : [typeOrTypes];
          expectResult(result, ...types.map((x) => createTypeClause(x, namespaces)));
        }
        // also test with no specified type/s
        const result = getQueryParams({ mappings, registry, type: undefined, namespaces });
        expectResult(result, ...ALL_TYPES.map((x) => createTypeClause(x, namespaces)));
      };

      it('normalizes and deduplicates provided namespaces', () => {
        const result = getQueryParams({
          mappings,
          registry,
          search: '*',
          namespaces: ['foo', '*', 'foo', 'bar', 'default'],
        });

        expectResult(
          result,
          ...ALL_TYPES.map((x) => createTypeClause(x, ['foo', 'default', 'bar']))
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
  });

  describe('search clause (query.bool.must.simple_query_string)', () => {
    const search = 'foo*';

    const expectResult = (result: Result, sqsClause: any) => {
      expect(result.query.bool.must).toEqual([{ simple_query_string: sqsClause }]);
    };

    describe('`search` parameter', () => {
      it('does not include clause when `search` is not specified', () => {
        const result = getQueryParams({
          mappings,
          registry,
          search: undefined,
        });
        expect(result.query.bool.must).toBeUndefined();
      });

      it('creates a clause with query for specified search', () => {
        const result = getQueryParams({
          mappings,
          registry,
          search,
        });
        expectResult(result, expect.objectContaining({ query: search }));
      });
    });

    describe('`searchFields` parameter', () => {
      const getExpectedFields = (searchFields: string[], typeOrTypes: string | string[]) => {
        const types = Array.isArray(typeOrTypes) ? typeOrTypes : [typeOrTypes];
        return searchFields.map((x) => types.map((y) => `${y}.${x}`)).flat();
      };

      const test = (searchFields: string[]) => {
        for (const typeOrTypes of ALL_TYPE_SUBSETS) {
          const result = getQueryParams({
            mappings,
            registry,
            type: typeOrTypes,
            search,
            searchFields,
          });
          const fields = getExpectedFields(searchFields, typeOrTypes);
          expectResult(result, expect.objectContaining({ fields }));
        }
        // also test with no specified type/s
        const result = getQueryParams({
          mappings,
          registry,
          type: undefined,
          search,
          searchFields,
        });
        const fields = getExpectedFields(searchFields, ALL_TYPES);
        expectResult(result, expect.objectContaining({ fields }));
      };

      it('includes lenient flag and all fields when `searchFields` is not specified', () => {
        const result = getQueryParams({
          mappings,
          registry,
          search,
          searchFields: undefined,
        });
        expectResult(result, expect.objectContaining({ lenient: true, fields: ['*'] }));
      });

      it('includes specified search fields for appropriate type/s', () => {
        test(['title']);
      });

      it('supports boosting', () => {
        test(['title^3']);
      });

      it('supports multiple fields', () => {
        test(['title, title.raw']);
      });
    });

    describe('`defaultSearchOperator` parameter', () => {
      it('does not include default_operator when `defaultSearchOperator` is not specified', () => {
        const result = getQueryParams({
          mappings,
          registry,
          search,
          defaultSearchOperator: undefined,
        });
        expectResult(result, expect.not.objectContaining({ default_operator: expect.anything() }));
      });

      it('includes specified default operator', () => {
        const defaultSearchOperator = 'AND';
        const result = getQueryParams({
          mappings,
          registry,
          search,
          defaultSearchOperator,
        });
        expectResult(result, expect.objectContaining({ default_operator: defaultSearchOperator }));
      });
    });
  });

  describe('namespaces property', () => {
    ALL_TYPES.forEach((type) => {
      it(`throws for ${type} when namespaces is an empty array`, () => {
        expect(() =>
          getQueryParams({
            mappings,
            registry,
            namespaces: [],
          })
        ).toThrowError('cannot specify empty namespaces array');
      });
    });
  });
});
