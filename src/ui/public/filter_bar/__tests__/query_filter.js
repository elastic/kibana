import _ from 'lodash';
import expect from 'expect.js';
import ngMock from 'ngMock';
import './_getFilters';
import './_addFilters';
import './_removeFilters';
import './_updateFilters';
import './_toggleFilters';
import './_invertFilters';
import './_pinFilters';
import FilterBarQueryFilterProvider from 'ui/filter_bar/query_filter';
import EventsProvider from 'ui/events';
var queryFilter;
var EventEmitter;
var $rootScope;

describe('Query Filter', function () {
  describe('Module', function () {
    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (_$rootScope_, Private) {
      $rootScope = _$rootScope_;
      queryFilter = Private(FilterBarQueryFilterProvider);
      EventEmitter = Private(EventsProvider);
    }));

    describe('module instance', function () {
      it('should be an event emitter', function () {
        expect(queryFilter).to.be.an(EventEmitter);
      });
    });

    describe('module methods', function () {
      it('should have methods for getting filters', function () {
        expect(queryFilter.getFilters).to.be.a('function');
        expect(queryFilter.getAppFilters).to.be.a('function');
        expect(queryFilter.getGlobalFilters).to.be.a('function');
      });

      it('should have methods for modifying filters', function () {
        expect(queryFilter.addFilters).to.be.a('function');
        expect(queryFilter.toggleFilter).to.be.a('function');
        expect(queryFilter.toggleAll).to.be.a('function');
        expect(queryFilter.removeFilter).to.be.a('function');
        expect(queryFilter.removeAll).to.be.a('function');
        expect(queryFilter.updateFilter).to.be.a('function');
        expect(queryFilter.invertFilter).to.be.a('function');
        expect(queryFilter.invertAll).to.be.a('function');
        expect(queryFilter.pinFilter).to.be.a('function');
        expect(queryFilter.pinAll).to.be.a('function');
      });

    });

  });

  describe('Actions', function () {
  });
});
