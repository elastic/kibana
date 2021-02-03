/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { isEqual, cloneDeep } from 'lodash';
import { migrateFilter, DeprecatedMatchPhraseFilter } from './migrate_filter';
import { PhraseFilter, MatchAllFilter } from '../filters';

describe('migrateFilter', function () {
  const oldMatchPhraseFilter = ({
    query: {
      match: {
        fieldFoo: {
          query: 'foobar',
          type: 'phrase',
        },
      },
    },
    meta: {},
  } as unknown) as DeprecatedMatchPhraseFilter;

  const newMatchPhraseFilter = ({
    query: {
      match_phrase: {
        fieldFoo: {
          query: 'foobar',
        },
      },
    },
    meta: {},
  } as unknown) as PhraseFilter;

  it('should migrate match filters of type phrase', function () {
    const migratedFilter = migrateFilter(oldMatchPhraseFilter, undefined);

    expect(migratedFilter).toEqual(newMatchPhraseFilter);
  });

  it('should not modify the original filter', function () {
    const oldMatchPhraseFilterCopy = cloneDeep(oldMatchPhraseFilter);

    migrateFilter(oldMatchPhraseFilter, undefined);

    expect(isEqual(oldMatchPhraseFilter, oldMatchPhraseFilterCopy)).toBe(true);
  });

  it('should return the original filter if no migration is necessary', function () {
    const originalFilter = {
      match_all: {},
    } as MatchAllFilter;
    const migratedFilter = migrateFilter(originalFilter, undefined);

    expect(migratedFilter).toBe(originalFilter);
    expect(isEqual(migratedFilter, originalFilter)).toBe(true);
  });
});
