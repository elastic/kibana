import expect from 'expect.js';
import { RangeFilterManager } from '../range_filter_manager';

describe('RangeFilterManager', function () {

  describe('createFilter', function () {
    const indexPatternId = '1';
    const fieldMock = {
      name: 'field1'
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
      filterManager = new RangeFilterManager('field1', indexPatternMock, queryFilterMock);
    });

    it('should create range filter from slider value', function () {
      const newFilter = filterManager.createFilter({ min: 1, max: 3 });
      expect(newFilter).to.have.property('meta');
      expect(newFilter.meta.index).to.be(indexPatternId);
      expect(newFilter).to.have.property('range');
      expect(JSON.stringify(newFilter.range, null, '')).to.be('{"field1":{"gte":1,"lt":3}}');
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
      filterManager = new RangeFilterManager('field1', indexPatternMock, queryFilterMock);
    });

    it('should not find range filters for other fields', function () {
      kbnFilters.push({
        range: {
          notField1: {
            gte: 1,
            lt: 3
          }
        }
      });
      const foundFilters = filterManager.findFilters();
      expect(foundFilters.length).to.be(0);
    });

    it('should find range filters for target fields', function () {
      kbnFilters.push({
        range: {
          field1: {
            gte: 1,
            lt: 3
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
      class MockFindFiltersRangeFilterManager extends RangeFilterManager {
        constructor(fieldName, indexPattern, queryFilter) {
          super(fieldName, indexPattern, queryFilter);
          this.mockFilters = [];
        }
        findFilters() {
          return this.mockFilters;
        }
        setMockFilters(mockFilters) {
          this.mockFilters = mockFilters;
        }
      }
      filterManager = new MockFindFiltersRangeFilterManager('field1', indexPatternMock, queryFilterMock);
    });

    it('should extract value from range filter', function () {
      filterManager.setMockFilters([
        {
          range: {
            field1: {
              gte: 1,
              lt: 3
            }
          }
        }
      ]);
      const value = filterManager.getValueFromFilterBar();
      expect(value).to.be.a('object');
      expect(value).to.have.property('min');
      expect(value.min).to.be(1);
      expect(value).to.have.property('max');
      expect(value.max).to.be(3);
    });
  });

});

