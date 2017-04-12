import _ from 'lodash';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import { PointSeriesInitXAxisProvider } from 'ui/agg_response/point_series/_init_x_axis';

describe('initXAxis', function () {

  let initXAxis;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    initXAxis = Private(PointSeriesInitXAxisProvider);
  }));

  const baseChart = {
    aspects: {
      x: {
        agg: {
          fieldFormatter: _.constant({}),
          write: _.constant({ params: {} }),
          type: {}
        },
        col: {
          title: 'label'
        }
      }
    }
  };
  const field = {};
  const indexPattern = {};

  it('sets the xAxisFormatter if the agg is not ordered', function () {
    const chart = _.cloneDeep(baseChart);
    initXAxis(chart);
    expect(chart)
      .to.have.property('xAxisLabel', 'label')
      .and.have.property('xAxisFormatter', chart.aspects.x.agg.fieldFormatter());
  });

  it('makes the chart ordered if the agg is ordered', function () {
    const chart = _.cloneDeep(baseChart);
    chart.aspects.x.agg.type.ordered = true;
    chart.aspects.x.agg.params = {
      field: field
    };
    chart.aspects.x.agg.vis = {
      indexPattern: indexPattern
    };

    initXAxis(chart);
    expect(chart)
      .to.have.property('xAxisLabel', 'label')
      .and.have.property('xAxisFormatter', chart.aspects.x.agg.fieldFormatter())
      .and.have.property('indexPattern', indexPattern)
      .and.have.property('xAxisField', field)
      .and.have.property('ordered');

    expect(chart.ordered)
      .to.be.an('object')
      .and.not.have.property('interval');
  });

  it('reads the interval param from the x agg', function () {
    const chart = _.cloneDeep(baseChart);
    chart.aspects.x.agg.type.ordered = true;
    chart.aspects.x.agg.write = _.constant({ params: { interval: 10 } });
    chart.aspects.x.agg.params = {
      field: field
    };
    chart.aspects.x.agg.vis = {
      indexPattern: indexPattern
    };

    initXAxis(chart);
    expect(chart)
      .to.have.property('xAxisLabel', 'label')
      .and.have.property('xAxisFormatter', chart.aspects.x.agg.fieldFormatter())
      .and.have.property('indexPattern', indexPattern)
      .and.have.property('xAxisField', field)
      .and.have.property('ordered');

    expect(chart.ordered)
      .to.be.an('object')
      .and.have.property('interval', 10);
  });
});
