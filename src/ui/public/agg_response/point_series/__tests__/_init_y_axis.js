import _ from 'lodash';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import AggResponsePointSeriesInitYAxisProvider from 'ui/agg_response/point_series/_init_y_axis';
describe('initYAxis', function () {

  let initYAxis;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    initYAxis = Private(AggResponsePointSeriesInitYAxisProvider);
  }));

  function agg(onSecondaryYAxis) {
    return {
      fieldFormatter: _.constant({}),
      write: _.constant({ params: {} }),
      type: {},
      onSecondaryYAxis: onSecondaryYAxis
    };
  }

  let baseChart = function (forSecondaryYAxis) {
    return {
      aspects: {
        y: [
          { agg: agg(false), col: { title: 'y1' } },
          { agg: agg(forSecondaryYAxis), col: { title: 'y2' } },
        ],
        x: {
          agg: agg(false),
          col: { title: 'x' }
        }
      }
    };
  };

  describe('with a single y aspect', function () {
    let singleYBaseChart = baseChart(false);
    singleYBaseChart.aspects.y = singleYBaseChart.aspects.y[0];

    it('sets the yAxisFormatter the the field formats convert fn', function () {
      let chart = _.cloneDeep(singleYBaseChart);
      initYAxis(chart);
      expect(chart).to.have.property('yAxisFormatter', chart.aspects.y.agg.fieldFormatter());
    });

    it('sets the yAxisLabel', function () {
      let chart = _.cloneDeep(singleYBaseChart);
      initYAxis(chart);
      expect(chart).to.have.property('yAxisLabel', 'y1');
    });
  });

  describe('with mutliple y aspects', function () {
    it('sets the yAxisFormatter the the field formats convert fn for the first y aspect', function () {
      let chart = baseChart(false);
      initYAxis(chart);

      expect(chart).to.have.property('yAxisFormatter');
      expect(chart.yAxisFormatter)
        .to.be(chart.aspects.y[0].agg.fieldFormatter())
        .and.not.be(chart.aspects.y[1].agg.fieldFormatter());
    });

    it('does not set the yAxisLabel, it does not make sense to put multiple labels on the same axis', function () {
      let chart = baseChart(false);
      initYAxis(chart);
      expect(chart).to.have.property('yAxisLabel', '');
    });

    it('sets the yAxislabel for secondary axis and use the right formatter', function () {
      let chart = baseChart(true);
      initYAxis(chart);

      expect(chart.secondYAxisLabel).to.be(chart.aspects.y[1].col.title);
      expect(chart.secondYAxisFormatter)
        .to.be(chart.aspects.y[1].agg.fieldFormatter())
        .and.not.be(chart.aspects.y[0].agg.fieldFormatter());
    });
  });
});
