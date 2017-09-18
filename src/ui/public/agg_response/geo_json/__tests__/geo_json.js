
import _ from 'lodash';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import { VisProvider } from 'ui/vis';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import FixturesAggRespGeohashGridProvider from 'fixtures/agg_resp/geohash_grid';
import { AggResponseTabifyProvider } from 'ui/agg_response/tabify/tabify';
import { AggResponseGeoJsonProvider } from 'ui/agg_response/geo_json/geo_json';

describe('GeoJson Agg Response Converter', function () {
  let vis;
  let tabify;
  let convert;
  let esResponse;
  let expectedAggs;

  let createVis;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    const Vis = Private(VisProvider);
    const indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);

    esResponse = Private(FixturesAggRespGeohashGridProvider);
    tabify = Private(AggResponseTabifyProvider);
    convert = Private(AggResponseGeoJsonProvider);

    createVis = function (useGeocentroid) {
      vis = new Vis(indexPattern, {
        type: 'tile_map',
        aggs: [
          { schema: 'metric', type: 'avg', params: { field: 'bytes' } },
          { schema: 'segment', type: 'geohash_grid', params: { field: 'geo.coordinates', precision: 3, useGeocentroid: useGeocentroid } }
        ],
        params: {
          isDesaturated: true,
          mapType: 'Scaled%20Circle%20Markers'
        }
      });

      expectedAggs = {
        metric: vis.aggs[0],
        geo: vis.aggs[1]
      };
      if (useGeocentroid) {
        expectedAggs.centroid = vis.aggs[2];
      }
    };

    createVis(false);
  }));

  [ { asAggConfigResults: true }, { asAggConfigResults: false } ].forEach(function (tableOpts) {

    function makeTable() {
      return _.sample(tabify(vis, esResponse, tableOpts).tables);
    }

    function makeSingleChart(table) {
      return convert(vis, table || makeTable(), tableOpts);
    }

    function makeGeoJson() {
      return makeSingleChart().geoJson;
    }

    describe('with table ' + JSON.stringify(tableOpts), function () {
      it('outputs a chart', function () {
        const table = makeTable();
        const chart = makeSingleChart(table);
        expect(chart).to.only.have.keys(
          'title',
          'tooltipFormatter',
          'valueFormatter',
          'geohashGridAgg',
          'geoJson'
        );

        expect(chart.title).to.be(table.title());
        expect(chart.tooltipFormatter).to.be.a('function');
        expect(chart.valueFormatter).to.be(expectedAggs.metric.fieldFormatter());
        expect(chart.geohashGridAgg).to.be(expectedAggs.geo);
        expect(chart.geoJson).to.be.an('object');
      });

      it('outputs geohash points as features in a feature collection', function () {
        const table = makeTable();
        const chart = makeSingleChart(table);
        const geoJson = chart.geoJson;

        expect(geoJson.type).to.be('FeatureCollection');
        expect(geoJson.features).to.be.an('array');
        expect(geoJson.features).to.have.length(table.rows.length);
      });

      it('exports a bunch of properties about the geo hash grid', function () {
        const geoJson = makeGeoJson();
        const props = geoJson.properties;

        // props
        expect(props).to.be.an('object');
        expect(props).to.have.keys('min', 'max');

        // props.min
        expect(props.min).to.be.a('number');
        expect(props.min).to.be.greaterThan(0);

        // props.max
        expect(props.max).to.be.a('number');
        expect(props.max).to.be.greaterThan(0);
      });

      describe('properties', function () {
        describe('includes one feature per row in the table', function () {
          this.timeout(60000);

          let table;
          let chart;
          let geoColI;
          let metricColI;

          before(function () {
            table = makeTable();
            chart = makeSingleChart(table);
            geoColI = _.findIndex(table.columns, { aggConfig: expectedAggs.geo });
            metricColI = _.findIndex(table.columns, { aggConfig: expectedAggs.metric });
          });

          it('should be geoJson format', function () {
            table.rows.forEach(function (row, i) {
              const feature = chart.geoJson.features[i];
              expect(feature).to.have.property('geometry');
              expect(feature.geometry).to.be.an('object');
              expect(feature).to.have.property('properties');
              expect(feature.properties).to.be.an('object');
            });
          });

          it('should have valid geometry data', function () {
            table.rows.forEach(function (row, i) {
              const geometry = chart.geoJson.features[i].geometry;
              expect(geometry.type).to.be('Point');
              expect(geometry).to.have.property('coordinates');
              expect(geometry.coordinates).to.be.an('array');
              expect(geometry.coordinates).to.have.length(2);
              expect(geometry.coordinates[0]).to.be.a('number');
              expect(geometry.coordinates[1]).to.be.a('number');
            });
          });

          it('should have value properties data', function () {
            table.rows.forEach(function (row, i) {
              const props = chart.geoJson.features[i].properties;
              const keys = ['value', 'geohash', 'aggConfigResult', 'rectangle', 'center'];
              expect(props).to.be.an('object');
              expect(props).to.only.have.keys(keys);
              expect(props.geohash).to.be.a('string');
              if (props.value != null) expect(props.value).to.be.a('number');
            });
          });

          it('should use latLng in properties and lngLat in geometry', function () {
            table.rows.forEach(function (row, i) {
              const geometry = chart.geoJson.features[i].geometry;
              const props = chart.geoJson.features[i].properties;
              expect(props.center).to.eql(geometry.coordinates.slice(0).reverse());
            });
          });

          it('should handle both AggConfig and non-AggConfig results', function () {
            table.rows.forEach(function (row, i) {
              const props = chart.geoJson.features[i].properties;
              if (tableOpts.asAggConfigResults) {
                expect(props.aggConfigResult).to.be(row[metricColI]);
                expect(props.value).to.be(row[metricColI].value);
                expect(props.geohash).to.be(row[geoColI].value);
              } else {
                expect(props.aggConfigResult).to.be(null);
                expect(props.value).to.be(row[metricColI]);
                expect(props.geohash).to.be(row[geoColI]);
              }
            });
          });
        });

        describe('geocentroid', function () {
          const createEsResponse = function (position = { lat: 37, lon: -122 }) {
            esResponse = {
              took: 1,
              timed_out: false,
              _shards: {
                total: 4,
                successful: 4,
                failed: 0
              },
              hits: {
                total: 61005,
                max_score: 0.0,
                hits: []
              },
              aggregations: {
                2: {
                  buckets: [{
                    key: '9q',
                    doc_count: 10307,
                    1: {
                      value: 10307
                    },
                    3: {
                      location: position
                    }
                  }]
                }
              }
            };
          };

          beforeEach(function () {
            createEsResponse();
            createVis(true);
          });

          it('should use geocentroid', function () {
            const chart = makeSingleChart();
            expect(chart.geoJson.features[0].geometry.coordinates).to.eql([ -122, 37 ]);
          });

          // 9q has latitude boundaries of 33.75 to 39.375
          // 9q has longituted boundaries of -123.75 to -112.5
          [
            {
              lat: 30,
              lon: -122,
              expected: [ -122, 33.75 ]
            },
            {
              lat: 45,
              lon: -122,
              expected: [ -122, 39.375 ]
            },
            {
              lat: 37,
              lon: -130,
              expected: [ -123.75, 37 ]
            },
            {
              lat: 37,
              lon: -110,
              expected: [ -112.5, 37 ]
            }
          ].forEach(function (position) {
            it('should clamp geocentroid ' + JSON.stringify(position), function () {
              createEsResponse(position);
              const chart = makeSingleChart();
              expect(chart.geoJson.features[0].geometry.coordinates).to.eql(position.expected);
            });
          });
        });
      });
    });
  });

  describe('geoJson tooltip formatter', function () {});
});
