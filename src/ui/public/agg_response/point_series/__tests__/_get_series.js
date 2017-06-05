import _ from 'lodash';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import { PointSeriesGetSeriesProvider } from 'ui/agg_response/point_series/_get_series';

describe('getSeries', function () {
  let getSeries;

  const agg = { fieldFormatter: _.constant(_.identity) };

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    getSeries = Private(PointSeriesGetSeriesProvider);
  }));

  function wrapRows(row) {
    return row.map(function (v) {
      return { value: v };
    });
  }

  it('produces a single series with points for each row', function () {
    const rows = [
      [1, 2, 3],
      [1, 2, 3],
      [1, 2, 3],
      [1, 2, 3],
      [1, 2, 3]
    ].map(wrapRows);

    const yCol = { aggConfig: {}, title: 'y' };
    const chart = {
      aspects: {
        x: { i: 0 },
        y: { i: 1, col: yCol, agg: { id: 'id' } },
        z: { i: 2 }
      }
    };

    const series = getSeries(rows, chart);

    expect(series)
      .to.be.an('array')
      .and.to.have.length(1);

    const siri = series[0];
    expect(siri)
      .to.be.an('object')
      .and.have.property('label', yCol.title)
      .and.have.property('values');

    expect(siri.values)
      .to.be.an('array')
      .and.have.length(5);

    siri.values.forEach(function (point) {
      expect(point)
        .to.have.property('x', 1)
        .and.property('y', 2)
        .and.property('z', 3);
    });
  });

  it('produces multiple series if there are multiple y aspects', function () {
    const rows = [
      [1, 2, 3],
      [1, 2, 3],
      [1, 2, 3],
      [1, 2, 3],
      [1, 2, 3]
    ].map(wrapRows);

    const chart = {
      aspects: {
        x: { i: 0 },
        y: [
          { i: 1, col: { title: '0' }, agg: { id: 1 } },
          { i: 2, col: { title: '1' }, agg: { id: 2 } },
        ]
      }
    };

    const series = getSeries(rows, chart);

    expect(series)
      .to.be.an('array')
      .and.to.have.length(2);

    series.forEach(function (siri, i) {
      expect(siri)
        .to.be.an('object')
        .and.have.property('label', '' + i)
        .and.have.property('values');

      expect(siri.values)
        .to.be.an('array')
        .and.have.length(5);

      siri.values.forEach(function (point) {
        expect(point)
          .to.have.property('x', 1)
          .and.property('y', i + 2);
      });
    });
  });

  it('produces multiple series if there is a series aspect', function () {
    const rows = [
      ['0', 3],
      ['1', 3],
      ['1', 'NaN'],
      ['0', 3],
      ['0', 'NaN'],
      ['1', 3],
      ['0', 3],
      ['1', 3]
    ].map(wrapRows);

    const chart = {
      aspects: {
        x: { i: -1 },
        series: { i: 0, agg: agg },
        y: { i: 1, col: { title: '0' }, agg: agg }
      }
    };

    const series = getSeries(rows, chart);

    expect(series)
      .to.be.an('array')
      .and.to.have.length(2);

    series.forEach(function (siri, i) {
      expect(siri)
        .to.be.an('object')
        .and.have.property('label', '' + i)
        .and.have.property('values');

      expect(siri.values)
        .to.be.an('array')
        .and.have.length(3);

      siri.values.forEach(function (point) {
        expect(point)
          .to.have.property('x', '_all')
          .and.property('y', 3);
      });
    });
  });

  it('produces multiple series if there is a series aspect and multipl y aspects', function () {
    const rows = [
      ['0', 3, 4],
      ['1', 3, 4],
      ['0', 3, 4],
      ['1', 3, 4],
      ['0', 3, 4],
      ['1', 3, 4]
    ].map(wrapRows);

    const chart = {
      aspects: {
        x: { i: -1 },
        series: { i: 0, agg: agg },
        y: [
          { i: 1, col: { title: '0' }, agg: { id: 1 } },
          { i: 2, col: { title: '1' }, agg: { id: 2 } }
        ]
      }
    };

    const series = getSeries(rows, chart);

    expect(series)
      .to.be.an('array')
      .and.to.have.length(4); // two series * two metrics

    checkSiri(series[0], '0: 0', 3);
    checkSiri(series[1], '0: 1', 4);
    checkSiri(series[2], '1: 0', 3);
    checkSiri(series[3], '1: 1', 4);

    function checkSiri(siri, label, y) {
      expect(siri)
        .to.be.an('object')
        .and.have.property('label', label)
        .and.have.property('values');

      expect(siri.values)
        .to.be.an('array')
        .and.have.length(3);

      siri.values.forEach(function (point) {
        expect(point)
          .to.have.property('x', '_all')
          .and.property('y', y);
      });
    }
  });

  it('produces a series list in the same order as its corresponding metric column', function () {
    const rows = [
      ['0', 3, 4],
      ['1', 3, 4],
      ['0', 3, 4],
      ['1', 3, 4],
      ['0', 3, 4],
      ['1', 3, 4]
    ].map(wrapRows);

    const chart = {
      aspects: {
        x: { i: -1 },
        series: { i: 0, agg: agg },
        y: [
          { i: 1, col: { title: '0' }, agg: { id: 1 } },
          { i: 2, col: { title: '1' }, agg: { id: 2 } }
        ]
      }
    };

    const series = getSeries(rows, chart);
    expect(series[0]).to.have.property('label', '0: 0');
    expect(series[1]).to.have.property('label', '0: 1');
    expect(series[2]).to.have.property('label', '1: 0');
    expect(series[3]).to.have.property('label', '1: 1');


    // switch the order of the y columns
    chart.aspects.y = chart.aspects.y.reverse();
    chart.aspects.y.forEach(function (y, i) {
      y.i = i;
    });

    const series2 = getSeries(rows, chart);
    expect(series2[0]).to.have.property('label', '0: 1');
    expect(series2[1]).to.have.property('label', '0: 0');
    expect(series2[2]).to.have.property('label', '1: 1');
    expect(series2[3]).to.have.property('label', '1: 0');
  });
});
