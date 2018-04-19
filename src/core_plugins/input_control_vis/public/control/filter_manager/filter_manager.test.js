import expect from 'expect.js';
import { FilterManager } from './filter_manager';

describe('FilterManager', function () {

  const controlId = 'control1';

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
      filterManager = new FilterManager(controlId, 'field1', indexPatternMock, queryFilterMock, '');
    });

    test('should not find filters that are not controlled by any visualization', function () {
      kbnFilters.push({});
      const foundFilters = filterManager.findFilters();
      expect(foundFilters.length).to.be(0);
    });

    test('should not find filters that are controlled by other Visualizations', function () {
      kbnFilters.push({
        meta: {
          controlledBy: 'anotherControl'
        }
      });
      const foundFilters = filterManager.findFilters();
      expect(foundFilters.length).to.be(0);
    });

    test('should find filter that is controlled by target Visualization', function () {
      kbnFilters.push({
        meta: {
          controlledBy: controlId
        }
      });
      const foundFilters = filterManager.findFilters();
      expect(foundFilters.length).to.be(1);
    });
  });


});
