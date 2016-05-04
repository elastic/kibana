import expect from 'expect.js';
import ngMock from 'ng_mock';

describe('pattern review directive', function () {
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

  describe('detecting date fields', function () {

    it('should detect sample strings in ISO 8601 format as date fields', function () {
      const scope = $rootScope.$new();
      scope.sampleDoc = {
        isodate: '2004-03-08T00:05:49.000Z'
      };

      $compile('<pattern-review-step sample-doc="sampleDoc" index-pattern="indexPattern"></pattern-review-step>')(scope);
      scope.$digest();

      expect(scope).to.have.property('indexPattern');
      expect(scope.indexPattern.fields[0].type).to.be('date');
    });

  });

  describe('conflicting array values', function () {

    it('should detect heterogeneous arrays and flag them with an error message', function () {
      const scope = $rootScope.$new();
      scope.sampleDoc = {
        badarray: ['foo', 42]
      };

      const element = $compile('<pattern-review-step sample-doc="sampleDoc" index-pattern="indexPattern"></pattern-review-step>')(scope);
      const controller = element.controller('patternReviewStep');
      scope.$digest();

      expect(controller).to.have.property('errors');

      // error message should mentioned the conflicting field
      expect(controller.errors[0]).to.contain('badarray');
    });

  });
});
