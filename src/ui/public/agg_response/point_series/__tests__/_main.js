import _ from 'lodash';
import moment from 'moment';
import AggConfigResult from 'ui/vis/agg_config_result';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import VisProvider from 'ui/vis';
import AggResponseTabifyTableProvider from 'ui/agg_response/tabify/_table';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import AggResponsePointSeriesPointSeriesProvider from 'ui/agg_response/point_series/point_series';
describe('pointSeriesChartDataFromTable', function () {
  this.slow(1000);


  let pointSeriesChartDataFromTable;
  let indexPattern;
  let Table;
  let Vis;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    Vis = Private(VisProvider);
    Table = Private(AggResponseTabifyTableProvider);
    indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
    pointSeriesChartDataFromTable = Private(AggResponsePointSeriesPointSeriesProvider);
  }));

  it('handles a table with just a count', function () {
    let vis = new Vis(indexPattern, { type: 'histogram' });
    let agg = vis.aggs[0];
    let result = new AggConfigResult(vis.aggs[0], void 0, 100, 100);

    let table = new Table();
    table.columns = [ { aggConfig: agg } ];
    table.rows.push([ result ]);

    let chartData = pointSeriesChartDataFromTable(vis, table);

    expect(chartData).to.be.an('object');
    expect(chartData.series).to.be.an('array');
    expect(chartData.series).to.have.length(1);
    let series = chartData.series[0];
    expect(series.values).to.have.length(1);
    expect(series.values[0])
      .to.have.property('x', '_all')
      .and.have.property('y', 100)
      .and.have.property('aggConfigResult', result);
  });

  it('handles a table with x and y column', function () {
    let vis = new Vis(indexPattern, {
      type: 'histogram',
      aggs: [
        { type: 'count', schema: 'metric' },
        { type: 'date_histogram', params: { field: '@timestamp', interval: 'hour' }, schema: 'segment' }
      ]
    });

    let y = {
      agg: vis.aggs[0],
      col: { aggConfig: vis.aggs[0], title: vis.aggs[0].makeLabel() },
      at: function (i) { return 100 * i; }
    };

    let x = {
      agg: vis.aggs[1],
      col: { aggConfig: vis.aggs[1] },
      at: function (i) { return moment().startOf('day').add(i, 'day').valueOf(); }
    };

    let rowCount = 3;
    let table = new Table();
    table.columns = [ x.col, y.col ];
    _.times(rowCount, function (i) {
      let date = new AggConfigResult(x.agg, void 0, x.at(i));
      table.rows.push([date, new AggConfigResult(y.agg, date, y.at(i))]);
    });

    let chartData = pointSeriesChartDataFromTable(vis, table);

    expect(chartData).to.be.an('object');
    expect(chartData.series).to.be.an('array');
    expect(chartData.series).to.have.length(1);
    let series = chartData.series[0];
    expect(series).to.have.property('label', y.col.title);
    expect(series.values).to.have.length(rowCount);
    series.values.forEach(function (point, i) {
      expect(point)
        .to.have.property('x', x.at(i))
        .and.property('y', y.at(i))
        .and.property('aggConfigResult');

      expect(point.aggConfigResult)
        .to.be.an(AggConfigResult)
        .and.property('value', y.at(i))
        .and.property('$parent');

      expect(point.aggConfigResult.$parent)
        .to.have.property('value', x.at(i))
        .and.property('$parent', undefined);
    });
  });

  it('handles a table with an x and two y aspects', function () {
    let vis = new Vis(indexPattern, {
      type: 'histogram',
      aggs: [
        { type: 'avg', schema: 'metric', params: { field: 'bytes' } },
        { type: 'date_histogram', params: { field: '@timestamp', interval: 'hour' }, schema: 'segment' },
        { type: 'max', schema: 'metric', params: { field: 'bytes' } }
      ]
    });

    let avg = {
      agg: vis.aggs[0],
      col: { title: 'average', aggConfig: vis.aggs[0] },
      at: function (i) { return 75.444 * (i + 1); }
    };

    let date = {
      agg: vis.aggs[1],
      col: { title: 'date', aggConfig: vis.aggs[1] },
      at: function (i) { return moment().startOf('day').add(i, 'day').valueOf(); }
    };

    let max = {
      agg: vis.aggs[2],
      col: { title: 'maximum', aggConfig: vis.aggs[2] },
      at: function (i) { return 100 * (i + 1); }
    };

    let rowCount = 3;
    let table = new Table();
    table.columns = [ date.col, avg.col, max.col ];
    _.times(rowCount, function (i) {
      let dateResult = new AggConfigResult(date.agg, void 0, date.at(i));
      let avgResult = new AggConfigResult(avg.agg, dateResult, avg.at(i));
      let maxResult = new AggConfigResult(max.agg, dateResult, max.at(i));
      table.rows.push([dateResult, avgResult, maxResult]);
    });

    let chartData = pointSeriesChartDataFromTable(vis, table);
    expect(chartData).to.be.an('object');
    expect(chartData.series).to.be.an('array');
    expect(chartData.series).to.have.length(2);
    chartData.series.forEach(function (siri, i) {
      let metric = i === 0 ? avg : max;

      expect(siri).to.have.property('label', metric.col.label);
      expect(siri.values).to.have.length(rowCount);
      siri.values.forEach(function (point, i) {
        expect(point).to.have.property('x');
        expect(point.x).to.be.a('number');

        expect(point).to.have.property('y');
        expect(point.y).to.be.a('number');
        expect(point).to.have.property('series', siri.label);

        expect(point).to.have.property('aggConfigResult');
        expect(point.aggConfigResult)
          .to.be.a(AggConfigResult)
          .and.have.property('aggConfig', metric.agg)
          .and.have.property('value', point.y)
          .and.to.have.property('$parent');

        expect(point.aggConfigResult.$parent)
          .to.be.an(AggConfigResult)
          .and.have.property('aggConfig', date.agg);
      });
    });
  });

  it('handles a table with an x, a series, and two y aspects', function () {
    let vis = new Vis(indexPattern, {
      type: 'histogram',
      aggs: [
        { type: 'terms', schema: 'group', params: { field: 'extension' } },
        { type: 'avg', schema: 'metric', params: { field: 'bytes' } },
        { type: 'date_histogram', params: { field: '@timestamp', interval: 'hour' }, schema: 'segment' },
        { type: 'max', schema: 'metric', params: { field: 'bytes' } }
      ]
    });

    let extensions = ['php', 'jpg', 'gif', 'css'];
    let term = {
      agg: vis.aggs[0],
      col: { title: 'extensions', aggConfig: vis.aggs[0] },
      at: function (i) { return extensions[i % extensions.length]; }
    };

    let avg = {
      agg: vis.aggs[1],
      col: { title: 'average', aggConfig: vis.aggs[1] },
      at: function (i) { return 75.444 * (i + 1); }
    };

    let date = {
      agg: vis.aggs[2],
      col: { title: 'date', aggConfig: vis.aggs[2] },
      at: function (i) { return moment().startOf('day').add(i, 'day').valueOf(); }
    };

    let max = {
      agg: vis.aggs[3],
      col: { title: 'maximum', aggConfig: vis.aggs[3] },
      at: function (i) { return 100 * (i + 1); }
    };

    let metricCount = 2;
    let rowsPerSegment = 2;
    let rowCount = extensions.length * rowsPerSegment;
    let table = new Table();
    table.columns = [ date.col, term.col, avg.col, max.col ];
    _.times(rowCount, function (i) {
      let dateResult = new AggConfigResult(date.agg, void 0, date.at(i));
      let termResult = new AggConfigResult(term.agg, dateResult, term.at(i));
      let avgResult = new AggConfigResult(avg.agg, termResult, avg.at(i));
      let maxResult = new AggConfigResult(max.agg, termResult, max.at(i));
      table.rows.push([dateResult, termResult, avgResult, maxResult]);
    });

    let chartData = pointSeriesChartDataFromTable(vis, table);
    expect(chartData).to.be.an('object');
    expect(chartData.series).to.be.an('array');
    // one series for each extension, and then one for each metric inside
    expect(chartData.series).to.have.length(extensions.length * metricCount);
    chartData.series.forEach(function (siri, i) {
      // figure out the metric used to create this series
      let metricAgg = siri.values[0].aggConfigResult.aggConfig;
      let metric = avg.agg === metricAgg ? avg : max;

      expect(siri.values).to.have.length(rowsPerSegment);
      siri.values.forEach(function (point) {
        expect(point).to.have.property('x');
        expect(point.x).to.be.a('number');

        expect(point).to.have.property('y');
        expect(point.y).to.be.a('number');

        expect(point).to.have.property('series');
        expect(_.contains(extensions, point.series)).to.be.ok();

        expect(point).to.have.property('aggConfigResult');
        expect(point.aggConfigResult)
          .to.be.a(AggConfigResult)
          .and.have.property('aggConfig', metric.agg)
          .and.have.property('value', point.y)
          .and.to.have.property('$parent');

        expect(point.aggConfigResult.$parent)
          .to.be.an(AggConfigResult)
          .and.have.property('aggConfig', term.agg);
      });
    });
  });
});
