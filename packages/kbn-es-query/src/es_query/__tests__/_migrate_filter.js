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

import expect from '@kbn/expect';
import _ from 'lodash';
import { migrateFilter } from '../migrate_filter';

describe('migrateFilter', function () {

  const oldMatchPhraseFilter = {
    match: {
      fieldFoo: {
        query: 'foobar',
        type: 'phrase'
      }
    }
  };

  const newMatchPhraseFilter = {
    match_phrase: {
      fieldFoo: {
        query: 'foobar'
      }
    }
  };

  // https://github.com/elastic/elasticsearch/pull/17508
  it('should migrate match filters of type phrase', function () {
    const migratedFilter = migrateFilter(oldMatchPhraseFilter);
    expect(_.isEqual(migratedFilter, newMatchPhraseFilter)).to.be(true);
  });

  it('should not modify the original filter', function () {
    const oldMatchPhraseFilterCopy = _.clone(oldMatchPhraseFilter, true);
    migrateFilter(oldMatchPhraseFilter);
    expect(_.isEqual(oldMatchPhraseFilter, oldMatchPhraseFilterCopy)).to.be(true);
  });

  it('should return the original filter if no migration is necessary', function () {
    const originalFilter = {
      match_all: {}
    };
    const migratedFilter = migrateFilter(originalFilter);
    expect(migratedFilter).to.be(originalFilter);
    expect(_.isEqual(migratedFilter, originalFilter)).to.be(true);
  });

});
