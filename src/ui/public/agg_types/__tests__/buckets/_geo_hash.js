import expect from 'expect.js';
import { AggTypesBucketsGeoHashProvider } from 'ui/agg_types/buckets/geo_hash';

describe('Geohash Agg', function () {

  // Mock BucketAggType that does not create an AggType, but instead returns the AggType parameters
  const BucketAggTypeMock = (aggOptions) => {
    return aggOptions.params;
  };
  const PrivateMock = (provider) => {
    switch (provider.name) {
      case 'AggTypesBucketsBucketAggTypeProvider':
        return BucketAggTypeMock;
        break;
      default:
        return () => {};
    }
  };
  const configMock = {
    get: () => {
      return 7;//"visualization:tileMap:maxPrecision"
    }
  };
  const params = AggTypesBucketsGeoHashProvider(PrivateMock, configMock); // eslint-disable-line new-cap

  describe('precision parameter', function () {

    const PRECISION_PARAM_INDEX = 6;
    const precisionParam = params[PRECISION_PARAM_INDEX];

    it('should select precision parameter', () => {
      expect(precisionParam.name).to.equal('precision');
    });

    describe('precision parameter write', function () {

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
        16: 7,
        17: 7,
        18: 7,
        19: 7,
        20: 7,
        21: 7
      };

      Object.keys(zoomToGeoHashPrecision).forEach((zoomLevel) => {
        it(`zoom level ${zoomLevel} should correspond to correct geohash-precision`, () => {
          const output = { params: {} };
          precisionParam.write({
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
