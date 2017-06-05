import expect from 'expect.js';
import ngMock from 'ng_mock';
import { FilterBarLibMapDefaultProvider } from 'ui/filter_bar/lib/map_default';

describe('Filter Bar Directive', function () {
  describe('mapDefault()', function () {

    let mapDefault;
    let $rootScope;
    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private, _$rootScope_) {
      $rootScope = _$rootScope_;
      mapDefault = Private(FilterBarLibMapDefaultProvider);
    }));

    it('should return the key and value for matching filters', function (done) {
      const filter = { query: { match_all: {} } };
      mapDefault(filter).then(function (result) {
        expect(result).to.have.property('key', 'query');
        expect(result).to.have.property('value', '{"match_all":{}}');
        done();
      });
      $rootScope.$apply();
    });

    it('should work with undefined filter types', function (done) {
      const filter = {
        'bool': {
          'must': {
            'term': {
              'geo.src': 'US'
            }
          }
        }
      };
      mapDefault(filter).then(function (result) {
        expect(result).to.have.property('key', 'bool');
        expect(result).to.have.property('value', JSON.stringify(filter.bool));
        done();
      });
      $rootScope.$apply();
    });

    it('should return undefined if there is no valid key', function (done) {
      const filter = { meta: {} };
      mapDefault(filter).catch(function (result) {
        expect(result).to.be(filter);
        done();
      });
      $rootScope.$apply();
    });


  });
});
