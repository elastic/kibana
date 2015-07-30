var _ = require('lodash');
var expect = require('expect.js');
var ngMock = require('ngMock');
var queryFilter;
var EventEmitter;
var $rootScope;

describe('Query Filter', function () {
  describe('Module', function () {
    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (_$rootScope_, Private) {
      $rootScope = _$rootScope_;
      queryFilter = Private(require('ui/filter_bar/query_filter'));
      EventEmitter = Private(require('ui/events'));
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
        expect(queryFilter.invertFilter).to.be.a('function');
        expect(queryFilter.invertAll).to.be.a('function');
        expect(queryFilter.pinFilter).to.be.a('function');
        expect(queryFilter.pinAll).to.be.a('function');
      });
    });
  });

  describe('Actions', function () {
    require('./_getFilters');
    require('./_addFilters');
    require('./_removeFilters');
    require('./_toggleFilters');
    require('./_invertFilters');
    require('./_pinFilters');
  });
});
