/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  addExcludedTypesToBoolQuery,
  addMustClausesToBoolQuery,
  addMustNotClausesToBoolQuery,
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
