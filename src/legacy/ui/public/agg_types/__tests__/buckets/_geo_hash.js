/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import expect from '@kbn/expect';
import sinon from 'sinon';
import { geoHashBucketAgg } from '../../buckets/geo_hash';
import * as AggConfigModule from '../../agg_config';
import * as BucketAggTypeModule from '../../buckets/_bucket_agg_type';

describe('Geohash Agg', () => {
  const initialZoom = 10;
  const initialMapBounds = {
    top_left: { lat: 1.0, lon: -1.0 },
    bottom_right: { lat: -1.0, lon: 1.0 },
  };

  const BucketAggTypeMock = aggOptions => {
    return aggOptions;
  };
  const AggConfigMock = (parent, aggOptions) => {
    return aggOptions;
  };
  const createAggregationMock = aggOptions => {
    return new AggConfigMock(null, aggOptions);
  };

  const aggMock = {
    getField: () => {
      return {
        name: 'location',
      };
    },
    params: {
      isFilteredByCollar: true,
      useGeocentroid: true,
      mapZoom: initialZoom,
    },
    aggConfigs: {},
    type: 'geohash_grid',
  };
  aggMock.aggConfigs.createAggConfig = createAggregationMock;

  before(function() {
    sinon.stub(AggConfigModule, 'AggConfig').callsFake(AggConfigMock);
    sinon.stub(BucketAggTypeModule, 'BucketAggType').callsFake(BucketAggTypeMock);
  });

  after(function() {
    AggConfigModule.AggConfig.restore();
    BucketAggTypeModule.BucketAggType.restore();
  });

  function initAggParams() {
    aggMock.params.isFilteredByCollar = true;
    aggMock.params.useGeocentroid = true;
    aggMock.params.mapBounds = initialMapBounds;
  }

  function zoomMap(zoomChange) {
    aggMock.params.mapZoom += zoomChange;
  }

  function moveMap(newBounds) {
    aggMock.params.mapBounds = newBounds;
  }

  function resetMap() {
    aggMock.params.mapZoom = initialZoom;
    aggMock.params.mapBounds = initialMapBounds;
    aggMock.params.mapCollar = {
      top_left: { lat: 1.5, lon: -1.5 },
      bottom_right: { lat: -1.5, lon: 1.5 },
      zoom: initialZoom,
    };
  }

  describe('precision parameter', () => {
    const PRECISION_PARAM_INDEX = 2;
    let precisionParam;
    beforeEach(() => {
      precisionParam = geoHashBucketAgg.params[PRECISION_PARAM_INDEX];
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
        21: 7,
      };

      Object.keys(zoomToGeoHashPrecision).forEach(zoomLevel => {
        it(`zoom level ${zoomLevel} should correspond to correct geohash-precision`, () => {
          const output = { params: {} };
          precisionParam.write(
            {
              params: {
                autoPrecision: true,
                mapZoom: zoomLevel,
              },
            },
            output
          );
          expect(output.params.precision).to.equal(zoomToGeoHashPrecision[zoomLevel]);
        });
      });
    });
  });

  describe('getRequestAggs', () => {
    describe('initial aggregation creation', () => {
      let requestAggs;
      beforeEach(() => {
        initAggParams();
        requestAggs = geoHashBucketAgg.getRequestAggs(aggMock);
      });

      it('should create filter, geohash_grid, and geo_centroid aggregations', () => {
        expect(requestAggs.length).to.equal(3);
        expect(requestAggs[0].type).to.equal('filter');
        expect(requestAggs[1].type).to.equal('geohash_grid');
        expect(requestAggs[2].type).to.equal('geo_centroid');
      });

      it('should set mapCollar in vis session state', () => {
        expect(aggMock).to.have.property('lastMapCollar');
        expect(aggMock.lastMapCollar).to.have.property('top_left');
        expect(aggMock.lastMapCollar).to.have.property('bottom_right');
        expect(aggMock.lastMapCollar).to.have.property('zoom');
      });

      // there was a bug because of an "&& mapZoom" check which excluded 0 as a valid mapZoom, but it is.
      it('should create filter, geohash_grid, and geo_centroid aggregations when zoom level 0', () => {
        aggMock.params.mapZoom = 0;
        requestAggs = geoHashBucketAgg.getRequestAggs(aggMock);
        expect(requestAggs.length).to.equal(3);
        expect(requestAggs[0].type).to.equal('filter');
        expect(requestAggs[1].type).to.equal('geohash_grid');
        expect(requestAggs[2].type).to.equal('geo_centroid');
      });
    });

    describe('aggregation options', () => {
      beforeEach(() => {
        initAggParams();
      });

      it('should only create geohash_grid and geo_centroid aggregations when isFilteredByCollar is false', () => {
        aggMock.params.isFilteredByCollar = false;
        const requestAggs = geoHashBucketAgg.getRequestAggs(aggMock);
        expect(requestAggs.length).to.equal(2);
        expect(requestAggs[0].type).to.equal('geohash_grid');
        expect(requestAggs[1].type).to.equal('geo_centroid');
      });

      it('should only create filter and geohash_grid aggregations when useGeocentroid is false', () => {
        aggMock.params.useGeocentroid = false;
        const requestAggs = geoHashBucketAgg.getRequestAggs(aggMock);
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
        origRequestAggs = geoHashBucketAgg.getRequestAggs(aggMock);
        origMapCollar = JSON.stringify(aggMock.lastMapCollar, null, '');
      });

      it('should not change geo_bounding_box filter aggregation and vis session state when map movement is within map collar', () => {
        moveMap({
          top_left: { lat: 1.1, lon: -1.1 },
          bottom_right: { lat: -0.9, lon: 0.9 },
        });

        const newRequestAggs = geoHashBucketAgg.getRequestAggs(aggMock);
        expect(JSON.stringify(origRequestAggs[0].params, null, '')).to.equal(
          JSON.stringify(newRequestAggs[0].params, null, '')
        );

        const newMapCollar = JSON.stringify(aggMock.lastMapCollar, null, '');
        expect(origMapCollar).to.equal(newMapCollar);
      });

      it('should change geo_bounding_box filter aggregation and vis session state when map movement is outside map collar', () => {
        moveMap({
          top_left: { lat: 10.0, lon: -10.0 },
          bottom_right: { lat: 9.0, lon: -9.0 },
        });

        const newRequestAggs = geoHashBucketAgg.getRequestAggs(aggMock);
        expect(JSON.stringify(origRequestAggs[0].params, null, '')).not.to.equal(
          JSON.stringify(newRequestAggs[0].params, null, '')
        );

        const newMapCollar = JSON.stringify(aggMock.lastMapCollar, null, '');
        expect(origMapCollar).not.to.equal(newMapCollar);
      });

      it('should change geo_bounding_box filter aggregation and vis session state when map zoom level changes', () => {
        zoomMap(-1);

        geoHashBucketAgg.getRequestAggs(aggMock);

        const newMapCollar = JSON.stringify(aggMock.lastMapCollar, null, '');
        expect(origMapCollar).not.to.equal(newMapCollar);
      });
    });
  });
});
