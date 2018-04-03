import expect from 'expect.js';
import { RangeFilterManager } from './range_filter_manager';

describe('RangeFilterManager', function () {

  const controlId = 'control1';

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
      filterManager = new RangeFilterManager(controlId, 'field1', indexPatternMock, queryFilterMock);
    });

    test('should create range filter from slider value', function () {
      const newFilter = filterManager.createFilter({ min: 1, max: 3 });
      expect(newFilter).to.have.property('meta');
      expect(newFilter.meta.index).to.be(indexPatternId);
      expect(newFilter.meta.controlledBy).to.be(controlId);
      expect(newFilter).to.have.property('range');
      expect(JSON.stringify(newFilter.range, null, '')).to.be('{"field1":{"gte":1,"lte":3}}');
    });
  });

  describe('getValueFromFilterBar', function () {
    const indexPatternMock = {};
    const queryFilterMock = {};
    let filterManager;
    beforeEach(() => {
      class MockFindFiltersRangeFilterManager extends RangeFilterManager {
        constructor(controlId, fieldName, indexPattern, queryFilter) {
          super(controlId, fieldName, indexPattern, queryFilter);
          this.mockFilters = [];
        }
        findFilters() {
          return this.mockFilters;
        }
        setMockFilters(mockFilters) {
          this.mockFilters = mockFilters;
        }
      }
      filterManager = new MockFindFiltersRangeFilterManager(controlId, 'field1', indexPatternMock, queryFilterMock);
    });

    test('should extract value from range filter', function () {
      filterManager.setMockFilters([
        {
          range: {
            field1: {
              gte: 1,
              lte: 3
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

