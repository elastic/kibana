import expect from 'expect.js';
import sinon from 'sinon';
import ngMock from 'ng_mock';
import { AggTypesBucketsGeoHashProvider } from '../../buckets/geo_hash';
import * as AggConfigModule from '../../../vis/agg_config';
import { AggTypesIndexProvider } from '../..';

describe('Geohash Agg', () => {

  const intialZoom = 10;
  const initialMapBounds = {
    top_left: { lat: 1.0, lon: -1.0 },
    bottom_right: { lat: -1.0, lon: 1.0 }
  };
  const aggMock = {
    getField: () => {
      return {
        name: 'location'
      };
    },
    params: {
      isFilteredByCollar: true,
      useGeocentroid: true
    },
    vis: {
      hasUiState: () => {
        return false;
      },
      params: {
        mapZoom: intialZoom
      },
      sessionState: {},
      aggs: []
    },
    type: 'geohash_grid',
  };
  const BucketAggTypeMock = (aggOptions) => {
    return aggOptions;
  };
  const AggConfigMock = (vis, aggOptions) => {
    return aggOptions;
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

  before(function () {
    sinon.stub(AggConfigModule, 'AggConfig', AggConfigMock);
  });

  after(function () {
    AggConfigModule.AggConfig.restore();
  });


  function initVisSessionState() {
    aggMock.vis.sessionState = {
      mapBounds: initialMapBounds
    };
  }

  function initAggParams() {
    aggMock.params.isFilteredByCollar = true;
    aggMock.params.useGeocentroid = true;
  }

  function zoomMap(zoomChange) {
    aggMock.vis.params.mapZoom += zoomChange;
  }

  function moveMap(newBounds) {
    aggMock.vis.sessionState.mapBounds = newBounds;
  }

  function resetMap() {
    aggMock.vis.params.mapZoom = intialZoom;
    aggMock.vis.sessionState.mapBounds = initialMapBounds;
    aggMock.vis.sessionState.mapCollar = {
      top_left: { lat: 1.5, lon: -1.5 },
      bottom_right: { lat: -1.5, lon: 1.5 },
      zoom: intialZoom
    };
  }

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    AggConfigModule.AggConfig.aggTypes = Private(AggTypesIndexProvider);
  }));

  let geohashAgg;
  beforeEach(() => {
    geohashAgg = AggTypesBucketsGeoHashProvider(PrivateMock, configMock); // eslint-disable-line new-cap
  });


  describe('precision parameter', () => {

    const PRECISION_PARAM_INDEX = 6;
    let precisionParam;
    beforeEach(() => {
      precisionParam = geohashAgg.params[PRECISION_PARAM_INDEX];
    });

    it('should select precision parameter', () => {
      expect(precisionParam.name).to.equal('precision');
    });

    describe('precision parameter write', () => {

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

  describe('getRequestAggs', () => {

    describe('initial aggregation creation', () => {
      let requestAggs;
      beforeEach(() => {
        initVisSessionState();
        initAggParams();
        requestAggs = geohashAgg.getRequestAggs(aggMock);
      });

      it('should create filter, geohash_grid, and geo_centroid aggregations', () => {
        expect(requestAggs.length).to.equal(3);
        expect(requestAggs[0].type).to.equal('filter');
        expect(requestAggs[1].type).to.equal('geohash_grid');
        expect(requestAggs[2].type).to.equal('geo_centroid');
      });

      it('should set mapCollar in vis session state', () => {
        expect(aggMock.vis.sessionState).to.have.property('mapCollar');
        expect(aggMock.vis.sessionState.mapCollar).to.have.property('top_left');
        expect(aggMock.vis.sessionState.mapCollar).to.have.property('bottom_right');
        expect(aggMock.vis.sessionState.mapCollar).to.have.property('zoom');
      });

      // there was a bug because of an "&& mapZoom" check which excluded 0 as a valid mapZoom, but it is.
      it('should create filter, geohash_grid, and geo_centroid aggregations when zoom level 0', () => {
        aggMock.vis.params.mapZoom = 0;
        requestAggs = geohashAgg.getRequestAggs(aggMock);
        expect(requestAggs.length).to.equal(3);
        expect(requestAggs[0].type).to.equal('filter');
        expect(requestAggs[1].type).to.equal('geohash_grid');
        expect(requestAggs[2].type).to.equal('geo_centroid');
      });
    });

    describe('aggregation options', () => {

      beforeEach(() => {
        initVisSessionState();
        initAggParams();
      });

      it('should only create geohash_grid and geo_centroid aggregations when isFilteredByCollar is false', () => {
        aggMock.params.isFilteredByCollar = false;
        const requestAggs = geohashAgg.getRequestAggs(aggMock);
        expect(requestAggs.length).to.equal(2);
        expect(requestAggs[0].type).to.equal('geohash_grid');
        expect(requestAggs[1].type).to.equal('geo_centroid');
      });

      it('should only create filter and geohash_grid aggregations when useGeocentroid is false', () => {
        aggMock.params.useGeocentroid = false;
        const requestAggs = geohashAgg.getRequestAggs(aggMock);
        expect(requestAggs.length).to.equal(2);
        expect(requestAggs[0].type).to.equal('filter');
        expect(requestAggs[1].type).to.equal('geohash_grid');

      });
    });

    describe('aggregation creation after map interaction', () => {

      let origRequestAggs;
      let origMapCollar;
      beforeEach(() => {
        resetMap();
        initAggParams();
        origRequestAggs = geohashAgg.getRequestAggs(aggMock);
        origMapCollar = aggMock.vis.sessionState.mapCollar;
      });

      it('should not change geo_bounding_box filter aggregation and vis session state when map movement is within map collar', () => {
        moveMap({
          top_left: { lat: 1.1, lon: -1.1 },
          bottom_right: { lat: -0.9, lon: 0.9 }
        });

        const newRequestAggs = geohashAgg.getRequestAggs(aggMock);
        expect(JSON.stringify(origRequestAggs[0].params, null, '')).to.equal(JSON.stringify(newRequestAggs[0].params, null, ''));

        const newMapCollar = aggMock.vis.sessionState.mapCollar;
        expect(JSON.stringify(origMapCollar, null, '')).to.equal(JSON.stringify(newMapCollar, null, ''));
      });

      it('should change geo_bounding_box filter aggregation and vis session state when map movement is outside map collar', () => {
        moveMap({
          top_left: { lat: 10.0, lon: -10.0 },
          bottom_right: { lat: 9.0, lon: -9.0 }
        });

        const newRequestAggs = geohashAgg.getRequestAggs(aggMock);
        expect(JSON.stringify(origRequestAggs[0].params, null, '')).not.to.equal(JSON.stringify(newRequestAggs[0].params, null, ''));

        const newMapCollar = aggMock.vis.sessionState.mapCollar;
        expect(JSON.stringify(origMapCollar, null, '')).not.to.equal(JSON.stringify(newMapCollar, null, ''));
      });

      it('should change geo_bounding_box filter aggregation and vis session state when map zoom level changes', () => {
        zoomMap(-1);

        const newRequestAggs = geohashAgg.getRequestAggs(aggMock);
        expect(JSON.stringify(origRequestAggs[0].params, null, '')).not.to.equal(JSON.stringify(newRequestAggs[0].params, null, ''));

        const newMapCollar = aggMock.vis.sessionState.mapCollar;
        expect(JSON.stringify(origMapCollar, null, '')).not.to.equal(JSON.stringify(newMapCollar, null, ''));
      });

    });

  });
});
