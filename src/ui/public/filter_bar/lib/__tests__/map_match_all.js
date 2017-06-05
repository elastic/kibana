import expect from 'expect.js';
import ngMock from 'ng_mock';
import { FilterBarLibMapMatchAllProvider } from 'ui/filter_bar/lib/map_match_all';

describe('ui/filter_bar/lib', function () {
  describe('mapMatchAll()', function () {
    let $rootScope;
    let mapMatchAll;
    let filter;


    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private, _$rootScope_) {
      $rootScope = _$rootScope_;
      mapMatchAll = Private(FilterBarLibMapMatchAllProvider);
      filter = {
        match_all: {},
        meta: {
          field: 'foo',
          formattedValue: 'bar'
        }
      };
    }));

    describe('when given a filter that is not match_all', function () {
      it('filter is rejected', function (done) {
        delete filter.match_all;
        mapMatchAll(filter).catch(result => {
          expect(result).to.be(filter);
          done();
        });
        $rootScope.$apply();
      });
    });

    describe('when given a match_all filter', function () {
      let result;
      beforeEach(function () {
        mapMatchAll(filter).then(r => result = r);
        $rootScope.$apply();
      });

      it('key is set to meta field', function () {
        expect(result).to.have.property('key', filter.meta.field);
      });

      it('value is set to meta formattedValue', function () {
        expect(result).to.have.property('value', filter.meta.formattedValue);
      });
    });
  });
});
