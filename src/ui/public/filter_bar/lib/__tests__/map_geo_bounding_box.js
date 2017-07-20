import expect from 'expect.js';
import ngMock from 'ng_mock';
import { FilterBarLibMapGeoBoundingBoxProvider } from 'ui/filter_bar/lib/map_geo_bounding_box';

describe('Filter Bar Directive', function () {
  describe('mapGeoBoundingBox()', function () {
    let mapGeoBoundingBox;
    let $rootScope;

    beforeEach(ngMock.module(
      'kibana',
      'kibana/courier',
      function ($provide) {
        $provide.service('courier', require('fixtures/mock_courier'));
      }
    ));

    beforeEach(ngMock.inject(function (Private, _$rootScope_) {
      mapGeoBoundingBox = Private(FilterBarLibMapGeoBoundingBoxProvider);
      $rootScope = _$rootScope_;
    }));

    it('should return the key and value for matching filters with bounds', function (done) {
      const filter = {
        meta: {
          index: 'logstash-*'
        },
        geo_bounding_box: {
          point: { // field name
            top_left: { lat: 5, lon: 10 },
            bottom_right: { lat: 15, lon: 20 }
          }
        }
      };
      mapGeoBoundingBox(filter).then(function (result) {
        expect(result).to.have.property('key', 'point');
        expect(result).to.have.property('value');
        // remove html entities and non-alphanumerics to get the gist of the value
        expect(result.value.replace(/&[a-z]+?;/g, '').replace(/[^a-z0-9]/g, '')).to.be('lat5lon10tolat15lon20');
        done();
      });
      $rootScope.$apply();
    });

    it('should return undefined for none matching', function (done) {
      const filter = { meta: { index: 'logstash-*' }, query: { query_string: { query: 'foo:bar' } } };
      mapGeoBoundingBox(filter).catch(function (result) {
        expect(result).to.be(filter);
        done();
      });
      $rootScope.$apply();
    });

    it('should return the key and value even when using ignore_unmapped', function (done) {
      const filter = {
        meta: {
          index: 'logstash-*'
        },
        geo_bounding_box: {
          ignore_unmapped: true,
          point: { // field name
            top_left: { lat: 5, lon: 10 },
            bottom_right: { lat: 15, lon: 20 }
          }
        }
      };
      mapGeoBoundingBox(filter).then(function (result) {
        expect(result).to.have.property('key', 'point');
        expect(result).to.have.property('value');
        // remove html entities and non-alphanumerics to get the gist of the value
        expect(result.value.replace(/&[a-z]+?;/g, '').replace(/[^a-z0-9]/g, '')).to.be('lat5lon10tolat15lon20');
        done();
      });
      $rootScope.$apply();
    });

  });
});
