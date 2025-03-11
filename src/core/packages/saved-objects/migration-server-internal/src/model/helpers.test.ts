/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FetchIndexResponse } from '../actions/fetch_indices';
import { BaseState } from '../state';
import {
  addExcludedTypesToBoolQuery,
  addMustClausesToBoolQuery,
  addMustNotClausesToBoolQuery,
  getAliases,
  getMigrationType,
  buildRemoveAliasActions,
  versionMigrationCompleted,
  MigrationType,
  getTempIndexName,
  createBulkIndexOperationTuple,
  hasLaterVersionAlias,
  aliasVersion,
  getIndexTypes,
} from './helpers';

describe('addExcludedTypesToBoolQuery', () => {
  it('generates a bool query which filters out the specified types', () => {
    const boolQuery = { must_not: [] };
    const types = ['type1', 'type2'];
    const result = addExcludedTypesToBoolQuery(types, boolQuery);
    expect(result).toEqual({
      bool: {
        must_not: [{ term: { type: 'type1' } }, { term: { type: 'type2' } }],
      },
    });
  });
});

describe('addMustClausesToBoolQuery', () => {
  it('generates a new bool query when no query is provided', () => {
    const boolQuery = undefined;
    const types = [{ term: { type: 'type1' } }, { term: { type: 'type2' } }];
    const result = addMustClausesToBoolQuery(types, boolQuery);
    expect(result).toEqual({
      bool: {
        must: [{ term: { type: 'type1' } }, { term: { type: 'type2' } }],
      },
    });
  });

  it('adds a new must clause to the provided bool query, if it did exist', () => {
    const boolQuery = {
      should: [
        { match: { 'name.first': { query: 'shay', _name: 'first' } } },
        { match: { 'name.last': { query: 'banon', _name: 'last' } } },
      ],
    };
    const types = [{ term: { type: 'type1' } }, { term: { type: 'type2' } }];
    const result = addMustClausesToBoolQuery(types, boolQuery);
    expect(result).toEqual({
      bool: {
        should: [
          { match: { 'name.first': { query: 'shay', _name: 'first' } } },
          { match: { 'name.last': { query: 'banon', _name: 'last' } } },
        ],
        must: [{ term: { type: 'type1' } }, { term: { type: 'type2' } }],
      },
    });
  });

  it('appends the given clauses to the existing must', () => {
    const boolQuery = {
      must: [
        { match: { type: 'search-session' } },
        { match: { 'search-session.persisted': false } },
      ],
    };

    const types = [{ term: { type: 'type1' } }, { term: { type: 'type2' } }];
    const result = addMustClausesToBoolQuery(types, boolQuery);
    expect(result).toEqual({
      bool: {
        must: [
          { match: { type: 'search-session' } },
          { match: { 'search-session.persisted': false } },
          { term: { type: 'type1' } },
          { term: { type: 'type2' } },
        ],
      },
    });
  });

  it('arrayifys the existing must clause if needed', () => {
    const boolQuery = {
      must: {
        term: { type: 'type0' },
      },
    };

    const types = [{ term: { type: 'type1' } }, { term: { type: 'type2' } }];
    const result = addMustClausesToBoolQuery(types, boolQuery);
    expect(result).toEqual({
      bool: {
        must: [
          { term: { type: 'type0' } },
          { term: { type: 'type1' } },
          { term: { type: 'type2' } },
        ],
      },
    });
  });
});

describe('addMustNotClausesToBoolQuery', () => {
  it('generates a new bool query when no query is provided', () => {
    const boolQuery = undefined;
    const types = [{ term: { type: 'type1' } }, { term: { type: 'type2' } }];
    const result = addMustNotClausesToBoolQuery(types, boolQuery);
    expect(result).toEqual({
      bool: {
        must_not: [{ term: { type: 'type1' } }, { term: { type: 'type2' } }],
      },
    });
  });

  it('adds a new must_not clause to the provided bool query, if it did not exist', () => {
    const boolQuery = {
      should: [
        { match: { 'name.first': { query: 'shay', _name: 'first' } } },
        { match: { 'name.last': { query: 'banon', _name: 'last' } } },
      ],
    };
    const types = [{ term: { type: 'type1' } }, { term: { type: 'type2' } }];
    const result = addMustNotClausesToBoolQuery(types, boolQuery);
    expect(result).toEqual({
      bool: {
        should: [
          { match: { 'name.first': { query: 'shay', _name: 'first' } } },
          { match: { 'name.last': { query: 'banon', _name: 'last' } } },
        ],
        must_not: [{ term: { type: 'type1' } }, { term: { type: 'type2' } }],
      },
    });
  });

  it('appends the given clauses to the existing must_not', () => {
    const boolQuery = {
      must_not: [
        { match: { type: 'search-session' } },
        { match: { 'search-session.persisted': false } },
      ],
    };

    const types = [{ term: { type: 'type1' } }, { term: { type: 'type2' } }];
    const result = addMustNotClausesToBoolQuery(types, boolQuery);
    expect(result).toEqual({
      bool: {
        must_not: [
          { match: { type: 'search-session' } },
          { match: { 'search-session.persisted': false } },
          { term: { type: 'type1' } },
          { term: { type: 'type2' } },
        ],
      },
    });
  });

  it('arrayifys the existing must_not clause if needed', () => {
    const boolQuery = {
      must_not: {
        term: { type: 'type0' },
      },
    };

    const types = [{ term: { type: 'type1' } }, { term: { type: 'type2' } }];
    const result = addMustNotClausesToBoolQuery(types, boolQuery);
    expect(result).toEqual({
      bool: {
        must_not: [
          { term: { type: 'type0' } },
          { term: { type: 'type1' } },
          { term: { type: 'type2' } },
        ],
      },
    });
  });
});

describe('aliasVersion', () => {
  test('empty', () => {
    expect(aliasVersion(undefined)).toEqual(undefined);
  });

  test('not a version alias', () => {
    expect(aliasVersion('.kibana')).toEqual(undefined);
  });

  test('supports arbitrary names and versions', () => {
    expect(aliasVersion('.kibana_task_manager_7.17.0')).toEqual('7.17.0');
  });

  test('supports index names too', () => {
    expect(aliasVersion('.kibana_8.8.0_001')).toEqual('8.8.0');
  });
});

describe('getAliases', () => {
  it('returns a right record of alias to index name pairs', () => {
    const indices: FetchIndexResponse = {
      '.kibana_8.0.0_001': {
        aliases: { '.kibana': {}, '.kibana_8.0.0': {} },
        mappings: { properties: {} },
        settings: {},
      },
      '.kibana_7.17.0_001': {
        aliases: { '.kibana_7.17.0': {} },
        mappings: { properties: {} },
        settings: {},
      },
    };
    expect(getAliases(indices)).toMatchInlineSnapshot(`
      Object {
        "_tag": "Right",
        "right": Object {
          ".kibana": ".kibana_8.0.0_001",
          ".kibana_7.17.0": ".kibana_7.17.0_001",
          ".kibana_8.0.0": ".kibana_8.0.0_001",
        },
      }
    `);
  });
  it('returns a left multiple_indices_per_alias when one alias points to multiple indices', () => {
    const indices: FetchIndexResponse = {
      '.kibana_8.0.0_001': {
        aliases: { '.kibana': {}, '.kibana_8.0.0': {} },
        mappings: { properties: {} },
        settings: {},
      },
      '.kibana_7.17.0_001': {
        aliases: { '.kibana': {}, '.kibana_7.17.0': {} },
        mappings: { properties: {} },
        settings: {},
      },
    };
    expect(getAliases(indices)).toMatchInlineSnapshot(`
      Object {
        "_tag": "Left",
        "left": Object {
          "alias": ".kibana",
          "indices": Array [
            ".kibana_8.0.0_001",
            ".kibana_7.17.0_001",
          ],
          "type": "multiple_indices_per_alias",
        },
      }
    `);
  });
});

describe('versionMigrationCompleted', () => {
  it('returns true if the current and version alias points to the same index', () => {
    expect(
      versionMigrationCompleted('.current-alias', '.version-alias', {
        '.current-alias': 'myindex',
        '.version-alias': 'myindex',
      })
    ).toBe(true);
  });
  it('returns false if the current and version alias does not point to the same index', () => {
    expect(
      versionMigrationCompleted('.current-alias', '.version-alias', {
        '.current-alias': 'myindex',
        '.version-alias': 'anotherindex',
      })
    ).toBe(false);
  });
  it('returns false if the current alias does not exist', () => {
    expect(
      versionMigrationCompleted('.current-alias', '.version-alias', {
        '.version-alias': 'myindex',
      })
    ).toBe(false);
  });
  it('returns false if the version alias does not exist', () => {
    expect(
      versionMigrationCompleted('.current-alias', '.version-alias', {
        '.current-alias': 'myindex',
      })
    ).toBe(false);
  });
  it('returns false if neither the version or current alias exists', () => {
    expect(versionMigrationCompleted('.current-alias', '.version-alias', {})).toBe(false);
  });
});

describe('hasLaterVersionAlias', () => {
  test('undefined', () => {
    expect(hasLaterVersionAlias('8.8.0', undefined)).toEqual(undefined);
  });

  test('empty', () => {
    expect(hasLaterVersionAlias('8.8.0', {})).toEqual(undefined);
  });

  test('only previous version alias', () => {
    expect(
      hasLaterVersionAlias('8.8.0', {
        '.kibana_7.17.0': '.kibana_7.17.0_001',
        '.kibana_8.6.0': '.kibana_8.6.0_001',
        '.kibana_8.7.2': '.kibana_8.7.2_001',
      })
    ).toEqual(undefined);
  });

  test('current version alias', () => {
    expect(
      hasLaterVersionAlias('8.8.0', {
        '.kibana_7.17.0': '.kibana_7.17.0_001',
        '.kibana_8.6.0': '.kibana_8.6.0_001',
        '.kibana_8.7.2': '.kibana_8.7.2_001',
        '.kibana_8.8.0': '.kibana_8.8.0_001',
      })
    ).toEqual(undefined);
  });

  test('next build alias', () => {
    expect(
      hasLaterVersionAlias('8.8.0', {
        '.kibana_7.17.0': '.kibana_7.17.0_001',
        '.kibana_8.6.0': '.kibana_8.6.0_001',
        '.kibana_8.7.2': '.kibana_8.7.2_001',
        '.kibana_8.8.0': '.kibana_8.8.0_001',
        '.kibana_8.8.1': '.kibana_8.8.0_001',
      })
    ).toEqual('.kibana_8.8.1');
  });

  test('next minor alias', () => {
    expect(
      hasLaterVersionAlias('8.8.1', {
        '.kibana_8.9.0': '.kibana_8.9.0_001',
        '.kibana_7.17.0': '.kibana_7.17.0_001',
        '.kibana_8.6.0': '.kibana_8.6.0_001',
        '.kibana_8.7.2': '.kibana_8.7.2_001',
        '.kibana_8.8.0': '.kibana_8.8.0_001',
        '.kibana_8.8.1': '.kibana_8.8.0_001',
      })
    ).toEqual('.kibana_8.9.0');
  });

  test('multiple future versions, return most recent alias', () => {
    expect(
      hasLaterVersionAlias('7.17.0', {
        '.kibana_8.9.0': '.kibana_8.9.0_001',
        '.kibana_8.9.1': '.kibana_8.9.0_001',
        '.kibana_7.17.0': '.kibana_7.17.0_001',
        '.kibana_8.6.0': '.kibana_8.6.0_001',
        '.kibana_8.7.2': '.kibana_8.7.2_001',
        '.kibana_8.8.0': '.kibana_8.8.0_001',
        '.kibana_8.8.1': '.kibana_8.8.0_001',
      })
    ).toEqual('.kibana_8.9.1');
  });
});

describe('buildRemoveAliasActions', () => {
  test('empty', () => {
    expect(buildRemoveAliasActions('.kibana_test_123', [], [])).toEqual([]);
  });
  test('no exclusions', () => {
    expect(buildRemoveAliasActions('.kibana_test_123', ['a', 'b', 'c'], [])).toEqual([
      { remove: { index: '.kibana_test_123', alias: 'a', must_exist: true } },
      { remove: { index: '.kibana_test_123', alias: 'b', must_exist: true } },
      { remove: { index: '.kibana_test_123', alias: 'c', must_exist: true } },
    ]);
  });
  test('with exclusions', () => {
    expect(buildRemoveAliasActions('.kibana_test_123', ['a', 'b', 'c'], ['b'])).toEqual([
      { remove: { index: '.kibana_test_123', alias: 'a', must_exist: true } },
      { remove: { index: '.kibana_test_123', alias: 'c', must_exist: true } },
    ]);
  });
});

describe('createBulkIndexOperationTuple', () => {
  it('creates the proper request body to bulk index a document', () => {
    const document = { _id: '', _source: { type: 'cases', title: 'a case' } };
    const typeIndexMap = {
      cases: '.kibana_cases_8.8.0_reindex_temp',
    };
    expect(createBulkIndexOperationTuple(document, typeIndexMap)).toMatchInlineSnapshot(`
      Array [
        Object {
          "index": Object {
            "_id": "",
            "_index": ".kibana_cases_8.8.0_reindex_temp",
          },
        },
        Object {
          "title": "a case",
          "type": "cases",
        },
      ]
    `);
  });

  it('does not include the index property if it is not specified in the typeIndexMap', () => {
    const document = { _id: '', _source: { type: 'cases', title: 'a case' } };
    expect(createBulkIndexOperationTuple(document)).toMatchInlineSnapshot(`
      Array [
        Object {
          "index": Object {
            "_id": "",
          },
        },
        Object {
          "title": "a case",
          "type": "cases",
        },
      ]
    `);
  });
});

describe('getMigrationType', () => {
  it.each`
    isMappingsCompatible | isVersionMigrationCompleted | expected
    ${true}              | ${true}                     | ${MigrationType.Unnecessary}
    ${true}              | ${false}                    | ${MigrationType.Compatible}
    ${false}             | ${false}                    | ${MigrationType.Incompatible}
    ${false}             | ${true}                     | ${MigrationType.Invalid}
  `(
    "returns '$expected' migration type",
    ({ isMappingsCompatible, isVersionMigrationCompleted, expected }) => {
      expect(getMigrationType({ isMappingsCompatible, isVersionMigrationCompleted })).toBe(
        expected
      );
    }
  );
});

describe('getTempIndexName', () => {
  it('composes a temporary index name for reindexing', () => {
    expect(getTempIndexName('.kibana_cases', '8.8.0')).toEqual('.kibana_cases_8.8.0_reindex_temp');
  });
});

describe('getIndexTypes', () => {
  it("returns the list of types that belong to a migrator's index, based on its state", () => {
    const baseState = {
      indexPrefix: '.kibana_task_manager',
      indexTypesMap: {
        '.kibana': ['foo', 'bar'],
        '.kibana_task_manager': ['task'],
      },
    };

    expect(getIndexTypes(baseState as unknown as BaseState)).toEqual(['task']);
  });
});
