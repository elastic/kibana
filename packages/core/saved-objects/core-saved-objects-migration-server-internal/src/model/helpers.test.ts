/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FetchIndexResponse } from '../actions/fetch_indices';
import {
  addExcludedTypesToBoolQuery,
  addMustClausesToBoolQuery,
  addMustNotClausesToBoolQuery,
  getAliases,
  buildRemoveAliasActions,
  versionMigrationCompleted,
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
