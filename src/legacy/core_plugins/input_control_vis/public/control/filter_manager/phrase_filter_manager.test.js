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
import { PhraseFilterManager } from './phrase_filter_manager';

describe('PhraseFilterManager', function () {

  const controlId = 'control1';

  describe('createFilter', function () {
    const indexPatternId = '1';
    const fieldMock = {
      name: 'field1',
      format: {
        convert: (val) => { return val; }
      }
    };
    const indexPatternMock = {
      id: indexPatternId,
      fields: {
        getByName: name => {
          const fields = { field1: fieldMock };
          return fields[name];
        }
      }
    };
    const queryFilterMock = {};
    let filterManager;
    beforeEach(() => {
      filterManager = new PhraseFilterManager(controlId, 'field1', indexPatternMock, queryFilterMock);
    });

    test('should create match phrase filter from single value', function () {
      const newFilter = filterManager.createFilter(['ios']);
      expect(newFilter).to.have.property('meta');
      expect(newFilter.meta.index).to.be(indexPatternId);
      expect(newFilter.meta.controlledBy).to.be(controlId);
      expect(newFilter.meta.key).to.be('field1');
      expect(newFilter).to.have.property('query');
      expect(JSON.stringify(newFilter.query, null, '')).to.be('{"match":{"field1":{"query":"ios","type":"phrase"}}}');
    });

    test('should create bool filter from multiple values', function () {
      const newFilter = filterManager.createFilter(['ios', 'win xp']);
      expect(newFilter).to.have.property('meta');
      expect(newFilter.meta.index).to.be(indexPatternId);
      expect(newFilter.meta.controlledBy).to.be(controlId);
      expect(newFilter.meta.key).to.be('field1');
      expect(newFilter).to.have.property('query');
      const query = newFilter.query;
      expect(query).to.have.property('bool');
      expect(query.bool.should.length).to.be(2);
      expect(JSON.stringify(query.bool.should[0], null, '')).to.be('{"match_phrase":{"field1":"ios"}}');
      expect(JSON.stringify(query.bool.should[1], null, '')).to.be('{"match_phrase":{"field1":"win xp"}}');
    });
  });

  describe('getValueFromFilterBar', function () {
    const indexPatternMock = {};
    const queryFilterMock = {};
    let filterManager;
    beforeEach(() => {
      class MockFindFiltersPhraseFilterManager extends PhraseFilterManager {
        constructor(controlId, fieldName, indexPattern, queryFilter, delimiter) {
          super(controlId, fieldName, indexPattern, queryFilter, delimiter);
          this.mockFilters = [];
        }
        findFilters() {
          return this.mockFilters;
        }
        setMockFilters(mockFilters) {
          this.mockFilters = mockFilters;
        }
      }
      filterManager = new MockFindFiltersPhraseFilterManager(controlId, 'field1', indexPatternMock, queryFilterMock);
    });

    test('should extract value from match phrase filter', function () {
      filterManager.setMockFilters([
        {
          query: {
            match: {
              field1: {
                query: 'ios',
                type: 'phrase'
              }
            }
          }
        }
      ]);
      expect(filterManager.getValueFromFilterBar()).to.eql(['ios']);
    });

    test('should extract value from multiple filters', function () {
      filterManager.setMockFilters([
        {
          query: {
            match: {
              field1: {
                query: 'ios',
                type: 'phrase'
              }
            }
          }
        },
        {
          query: {
            match: {
              field1: {
                query: 'win xp',
                type: 'phrase'
              }
            }
          }
        },
      ]);
      expect(filterManager.getValueFromFilterBar()).to.eql(['ios', 'win xp']);
    });

    test('should extract value from bool filter', function () {
      filterManager.setMockFilters([
        {
          query: {
            bool: {
              should: [
                {
                  match_phrase: {
                    field1: 'ios'
                  }
                },
                {
                  match_phrase: {
                    field1: 'win xp'
                  }
                }
              ]
            }
          }
        }
      ]);
      expect(filterManager.getValueFromFilterBar()).to.eql(['ios', 'win xp']);
    });

    test('should return undefined when filter value can not be extracted from Kibana filter', function () {
      filterManager.setMockFilters([
        {
          query: {
            match: {
              myFieldWhichIsNotField1: {
                query: 'ios',
                type: 'phrase'
              }
            }
          }
        }
      ]);
      expect(filterManager.getValueFromFilterBar()).to.eql(undefined);
    });
  });

});
