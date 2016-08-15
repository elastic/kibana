import expect from 'expect.js';
import AggTypesBucketsGeoHashProvider from 'ui/agg_types/buckets/geo_hash';

describe('Geohash Agg', function () {


  describe('write', function () {

    let paramWriter = new AggTypesBucketsGeoHashProvider(function PrivateMock() {
      return function BucketMock(geohashProvider) {
        return geohashProvider.params[4];
      };
    }, {});

    describe('interval', function () {

      const zoomToGeoHashPrecision = {
        0: 1,
        1: 2,
        2: 2,
        3: 2,
        4: 3,
        5: 3,
        6: 4,
        7: 4,
        8: 4,
        9: 5,
        10: 5,
        11: 6,
        12: 6,
        13: 6,
        14: 7,
        15: 7,
        16: 8,
        17: 8,
        18: 8,
        19: 9,
        20: 9,
        21: 10
      };

      Object.keys(zoomToGeoHashPrecision).forEach((zoomLevel) => {
        it(`zoom level ${zoomLevel} should correspond to correct geohash-precision`, () => {
          const output = {params: {}};
          paramWriter.write({
            vis: {
              hasUiState: () => true,
              uiStateVal: () => zoomLevel
            },
            params: {
              autoPrecision: true
            }
          }, output);
          expect(output.params.precision).to.equal(zoomToGeoHashPrecision[zoomLevel]);
        });
      });
    });

  });
});
