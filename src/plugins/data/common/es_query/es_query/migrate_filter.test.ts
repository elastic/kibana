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

import { isEqual, clone } from 'lodash';
import { migrateFilter, DeprecatedMatchPhraseFilter } from './migrate_filter';
import { PhraseFilter, MatchAllFilter } from '../filters';

describe('migrateFilter', function() {
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

  it('should migrate match filters of type phrase', function() {
    const migratedFilter = migrateFilter(oldMatchPhraseFilter, undefined);

    expect(migratedFilter).toEqual(newMatchPhraseFilter);
  });

  it('should not modify the original filter', function() {
    const oldMatchPhraseFilterCopy = clone(oldMatchPhraseFilter, true);

    migrateFilter(oldMatchPhraseFilter, undefined);

    expect(isEqual(oldMatchPhraseFilter, oldMatchPhraseFilterCopy)).toBe(true);
  });

  it('should return the original filter if no migration is necessary', function() {
    const originalFilter = {
      match_all: {},
    } as MatchAllFilter;
    const migratedFilter = migrateFilter(originalFilter, undefined);

    expect(migratedFilter).toBe(originalFilter);
    expect(isEqual(migratedFilter, originalFilter)).toBe(true);
  });
});
