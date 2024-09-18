/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isEqual, cloneDeep } from 'lodash';
import { migrateFilter, DeprecatedMatchPhraseFilter } from './migrate_filter';
import { PhraseFilter, MatchAllFilter } from '../filters';
import { Filter } from '../filters';

describe('migrateFilter', function () {
  const oldMatchPhraseFilter = {
    match: {
      fieldFoo: {
        query: 'foobar',
        type: 'phrase',
      },
    },
    meta: {},
  } as unknown as DeprecatedMatchPhraseFilter;

  const oldMatchPhraseFilter2 = {
    query: {
      match: {
        fieldFoo: {
          query: 'foobar',
          type: 'phrase',
        },
      },
    },
    meta: {},
  } as unknown as DeprecatedMatchPhraseFilter;

  const newMatchPhraseFilter = {
    query: {
      match_phrase: {
        fieldFoo: {
          query: 'foobar',
        },
      },
    },
    meta: {},
  } as unknown as PhraseFilter;

  it('should migrate match filters of type phrase', function () {
    const migratedFilter = migrateFilter(oldMatchPhraseFilter, undefined);
    expect(migratedFilter).toEqual(newMatchPhraseFilter);

    const migratedFilter2 = migrateFilter(oldMatchPhraseFilter2, undefined);
    expect(migratedFilter2).toEqual(newMatchPhraseFilter);
  });

  it('should not modify the original filter', function () {
    const oldMatchPhraseFilterCopy = cloneDeep(oldMatchPhraseFilter);

    migrateFilter(oldMatchPhraseFilter, undefined);

    expect(isEqual(oldMatchPhraseFilter, oldMatchPhraseFilterCopy)).toBe(true);
  });

  it('should return the original filter if no migration is necessary', function () {
    const originalFilter = {
      query: { match_all: {} },
    } as MatchAllFilter;
    const migratedFilter = migrateFilter(originalFilter, undefined);

    expect(migratedFilter).toEqual(originalFilter);
  });

  it('should handle the case where .query already exists and filter has other top level keys on there', function () {
    const originalFilter = {
      query: { match_all: {} },
      meta: {},
      size: 0,
    } as Filter;

    const filterAfterMigrate = {
      query: { match_all: {} },
      meta: {},
    } as Filter;

    const migratedFilter = migrateFilter(originalFilter, undefined);

    expect(migratedFilter).toEqual(filterAfterMigrate);
  });
});
