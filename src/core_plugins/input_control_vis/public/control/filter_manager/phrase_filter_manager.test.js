import expect from 'expect.js';
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
        byName: {
          field1: fieldMock
        }
      }
    };
    const queryFilterMock = {};
    let filterManager;
    beforeEach(() => {
      filterManager = new PhraseFilterManager(controlId, 'field1', indexPatternMock, queryFilterMock, '|');
    });

    test('should create match phrase filter from single value', function () {
      const newFilter = filterManager.createFilter('ios');
      expect(newFilter).to.have.property('meta');
      expect(newFilter.meta.index).to.be(indexPatternId);
      expect(newFilter.meta.controlledBy).to.be(controlId);
      expect(newFilter).to.have.property('query');
      expect(JSON.stringify(newFilter.query, null, '')).to.be('{"match":{"field1":{"query":"ios","type":"phrase"}}}');
    });

    test('should create bool filter from multiple values', function () {
      const newFilter = filterManager.createFilter('ios|win xp');
      expect(newFilter).to.have.property('meta');
      expect(newFilter.meta.index).to.be(indexPatternId);
      expect(newFilter.meta.controlledBy).to.be(controlId);
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
      filterManager = new MockFindFiltersPhraseFilterManager(controlId, 'field1', indexPatternMock, queryFilterMock, '|');
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
      expect(filterManager.getValueFromFilterBar()).to.be('ios');
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
      expect(filterManager.getValueFromFilterBar()).to.be('ios|win xp');
    });
  });

});
