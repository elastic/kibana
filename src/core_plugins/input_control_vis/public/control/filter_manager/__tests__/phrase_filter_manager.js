import expect from 'expect.js';
import { PhraseFilterManager } from '../phrase_filter_manager';

describe('PhraseFilterManager', function () {

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
      filterManager = new PhraseFilterManager('field1', indexPatternMock, queryFilterMock, '|');
    });

    it('should create match phrase filter from single value', function () {
      const newFilter = filterManager.createFilter('ios');
      expect(newFilter).to.have.property('meta');
      expect(newFilter.meta.index).to.be(indexPatternId);
      expect(newFilter).to.have.property('query');
      expect(JSON.stringify(newFilter.query, null, '')).to.be('{"match":{"field1":{"query":"ios","type":"phrase"}}}');
    });

    it('should create bool filter from multiple values', function () {
      const newFilter = filterManager.createFilter('ios|win xp');
      expect(newFilter).to.have.property('meta');
      expect(newFilter.meta.index).to.be(indexPatternId);
      expect(newFilter).to.have.property('query');
      const query = newFilter.query;
      expect(query).to.have.property('bool');
      expect(query.bool.should.length).to.be(2);
      expect(JSON.stringify(query.bool.should[0], null, '')).to.be('{"match_phrase":{"field1":"ios"}}');
      expect(JSON.stringify(query.bool.should[1], null, '')).to.be('{"match_phrase":{"field1":"win xp"}}');
    });
  });

  describe('findFilters', function () {
    const indexPatternMock = {};
    let kbnFilters;
    const queryFilterMock = {
      getAppFilters: () => { return kbnFilters; },
      getGlobalFilters: () => { return []; }
    };
    let filterManager;
    beforeEach(() => {
      kbnFilters = [];
      filterManager = new PhraseFilterManager('field1', indexPatternMock, queryFilterMock, '|');
    });

    it('should not find phrase filters for other fields', function () {
      kbnFilters.push({
        query: {
          match: {
            notField1: {
              query: 'ios',
              type: 'phrase'
            }
          }
        }
      });
      const foundFilters = filterManager.findFilters();
      expect(foundFilters.length).to.be(0);
    });

    it('should find phrase filters for target fields', function () {
      kbnFilters.push({
        query: {
          match: {
            field1: {
              query: 'ios',
              type: 'phrase'
            }
          }
        }
      });
      const foundFilters = filterManager.findFilters();
      expect(foundFilters.length).to.be(1);
    });

    it('should not find bool filters for other fields', function () {
      kbnFilters.push({
        query: {
          bool: {
            should: [
              {
                match_phrase: {
                  notField1: 'ios'
                }
              }
            ]
          }
        }
      });
      const foundFilters = filterManager.findFilters();
      expect(foundFilters.length).to.be(0);
    });

    it('should find bool filters for target field', function () {
      kbnFilters.push({
        query: {
          bool: {
            should: [
              {
                match_phrase: {
                  field1: 'ios'
                }
              }
            ]
          }
        }
      });
      const foundFilters = filterManager.findFilters();
      expect(foundFilters.length).to.be(1);
    });
  });

  describe('getValueFromFilterBar', function () {
    const indexPatternMock = {};
    const queryFilterMock = {};
    let filterManager;
    beforeEach(() => {
      class MockFindFiltersPhraseFilterManager extends PhraseFilterManager {
        constructor(fieldName, indexPattern, queryFilter, delimiter) {
          super(fieldName, indexPattern, queryFilter, delimiter);
          this.mockFilters = [];
        }
        findFilters() {
          return this.mockFilters;
        }
        setMockFilters(mockFilters) {
          this.mockFilters = mockFilters;
        }
      }
      filterManager = new MockFindFiltersPhraseFilterManager('field1', indexPatternMock, queryFilterMock, '|');
    });

    it('should extract value from match phrase filter', function () {
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

    it('should extract value from bool filter', function () {
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
