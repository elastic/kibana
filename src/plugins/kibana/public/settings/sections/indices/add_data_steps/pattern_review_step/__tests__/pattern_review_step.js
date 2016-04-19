import expect from 'expect.js';
import _ from 'lodash';
import ngMock from 'ng_mock';

describe.only('pattern review directive', function () {
  let $rootScope;
  let $compile;

  beforeEach(ngMock.module('kibana'));

  beforeEach(ngMock.inject(function ($injector, Private) {
    $compile = $injector.get('$compile');
    $rootScope = $injector.get('$rootScope');
  }));

  describe('handling geopoints', function () {

    it('should detect geo_point fields when they\'re expressed as an object', function () {
      const scope = $rootScope.$new();
      scope.sampleDoc = {
        geoip: {
          location: {
            lat: 38.6631,
            lon: -90.5771
          }
        }
      };

      $compile('<pattern-review-step sample-doc="sampleDoc" index-pattern="indexPattern"></pattern-review-step>')(scope);
      scope.$digest();

      expect(scope).to.have.property('indexPattern');
      expect(scope.indexPattern.fields[0].type).to.be('geo_point');
    });

    it('should not count the lat and lon properties as their own fields', function () {
      const scope = $rootScope.$new();
      scope.sampleDoc = {
        geoip: {
          location: {
            lat: 38.6631,
            lon: -90.5771
          }
        }
      };

      $compile('<pattern-review-step sample-doc="sampleDoc" index-pattern="indexPattern"></pattern-review-step>')(scope);
      scope.$digest();

      expect(scope).to.have.property('indexPattern');
      expect(scope.indexPattern.fields[0].type).to.be('geo_point');
      expect(scope.indexPattern.fields.length).to.be(1);
    });
  });

});
