import _ from 'lodash';
import moment from 'moment';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import { VisProvider } from 'ui/vis';
import { VisAggConfigProvider } from 'ui/vis/agg_config';
import { PointSeriesGetAspectsProvider } from 'ui/agg_response/point_series/_get_aspects';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';

describe('getAspects', function () {
  let Vis;
  let AggConfig;
  let indexPattern;
  let getAspects;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    Vis = Private(VisProvider);
    AggConfig = Private(VisAggConfigProvider);
    getAspects = Private(PointSeriesGetAspectsProvider);
    indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
  }));

  let vis;
  let table;

  const date = _.memoize(function (n) {
    return moment().startOf('day').add(n, 'hour').valueOf();
  });

  function filterByIndex(map) {
    return function (arr) {
      return arr.filter(function (val, i) {
        return map[i];
      });
    };
  }

  function validate(aspect, i) {
    expect(i).to.be.a('number');
    expect(aspect)
      .to.be.an('object')
      .and.have.property('i', i)
      .and.have.property('agg', vis.aggs[i])
      .and.have.property('col', table.columns[i]);
  }

  function init(group, x, y) {
    // map args to indicies that should be removed
    const filter = filterByIndex([
      x > 0,
      x > 1,
      group > 0,
      group > 1,
      y > 0,
      y > 1
    ]);

    vis = new Vis(indexPattern, {
      type: 'histogram',
      aggs: [
        { type: 'date_histogram', schema: 'segment', params: { field: '@timestamp' } },
        { type: 'date_histogram', schema: 'segment', params: { field: 'utc_time' } },
        { type: 'terms', schema: 'group', params: { field: 'extension' } },
        { type: 'terms', schema: 'group', params: { field: 'geo.src' } },
        { type: 'count', schema: 'metric' },
        { type: 'avg', schema: 'metric', params: { field: 'bytes' } }
      ]
    });

    table = {
      columns: filter([
        { aggConfig: vis.aggs[0] }, // date
        { aggConfig: vis.aggs[1] }, // date
        { aggConfig: vis.aggs[2] }, // extension
        { aggConfig: vis.aggs[3] }, // extension
        { aggConfig: vis.aggs[4] }, // count
        { aggConfig: vis.aggs[5] }  // avg
      ]),
      rows: [
        [ date(0), date(6), 'html', 'CN', 50, 50 ],
        [ date(0), date(7), 'css', 'CN', 100, 25 ],
        [ date(1), date(8), 'html', 'CN', 60, 50 ],
        [ date(1), date(9), 'css', 'CN', 120, 25 ],
        [ date(2), date(10), 'html', 'CN', 70, 50 ],
        [ date(2), date(11), 'css', 'CN', 140, 25 ],
        [ date(3), date(12), 'html', 'CN', 80, 50 ],
        [ date(3), date(13), 'css', 'CN', 160, 25 ]
      ].map(filter)
    };

    const aggs = vis.aggs.splice(0, vis.aggs.length);
    filter(aggs).forEach(function (filter) {
      vis.aggs.push(filter);
    });
  }

  it('produces an aspect object for each of the aspect types found in the columns', function () {
    init(1, 1, 1);

    const aspects = getAspects(vis, table);
    validate(aspects.x, 0);
    validate(aspects.series, 1);
    validate(aspects.y, 2);
  });

  it('uses arrays only when there are more than one aspect of a specific type', function () {
    init(0, 1, 2);

    const aspects = getAspects(vis, table);

    validate(aspects.x, 0);
    expect(aspects.series == null).to.be(true);

    expect(aspects.y).to.be.an('array').and.have.length(2);
    expect(aspects.y[0], 1);
    expect(aspects.y[1], 2);
  });

  it('throws an error if there are multiple x aspects', function () {
    init(0, 2, 1);

    expect(function () {
      getAspects(vis, table);
    }).to.throwError(TypeError);
  });

  it('throws an error if there are multiple series aspects', function () {
    init(2, 1, 1);

    expect(function () {
      getAspects(vis, table);
    }).to.throwError(TypeError);
  });

  it('creates a fake x aspect if the column does not exist', function () {
    init(0, 0, 1);

    const aspects = getAspects(vis, table);

    expect(aspects.x)
      .to.be.an('object')
      .and.have.property('i', -1)
      .and.have.property('agg')
      .and.have.property('col');

    expect(aspects.x.agg).to.be.an(AggConfig);
    expect(aspects.x.col)
      .to.be.an('object')
      .and.to.have.property('aggConfig', aspects.x.agg);

  });
});
