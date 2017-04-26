import _ from 'lodash';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import { PointSeriesInitYAxisProvider } from 'ui/agg_response/point_series/_init_y_axis';

describe('initYAxis', function () {

  let initYAxis;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    initYAxis = Private(PointSeriesInitYAxisProvider);
  }));

  function agg() {
    return {
      fieldFormatter: _.constant({}),
      write: _.constant({ params: {} }),
      type: {}
    };
  }

  const baseChart = {
    aspects: {
      y: [
        { agg: agg(), col: { title: 'y1' } },
        { agg: agg(), col: { title: 'y2' } },
      ],
      x: {
        agg: agg(),
        col: { title: 'x' }
      }
    }
  };

  describe('with a single y aspect', function () {
    const singleYBaseChart = _.cloneDeep(baseChart);
    singleYBaseChart.aspects.y = singleYBaseChart.aspects.y[0];

    it('sets the yAxisFormatter the the field formats convert fn', function () {
      const chart = _.cloneDeep(singleYBaseChart);
      initYAxis(chart);
      expect(chart).to.have.property('yAxisFormatter', chart.aspects.y.agg.fieldFormatter());
    });

    it('sets the yAxisLabel', function () {
      const chart = _.cloneDeep(singleYBaseChart);
      initYAxis(chart);
      expect(chart).to.have.property('yAxisLabel', 'y1');
    });
  });

  describe('with mutliple y aspects', function () {
    it('sets the yAxisFormatter the the field formats convert fn for the first y aspect', function () {
      const chart = _.cloneDeep(baseChart);
      initYAxis(chart);

      expect(chart).to.have.property('yAxisFormatter');
      expect(chart.yAxisFormatter)
        .to.be(chart.aspects.y[0].agg.fieldFormatter())
        .and.not.be(chart.aspects.y[1].agg.fieldFormatter());
    });

    it('does not set the yAxisLabel, it does not make sense to put multiple labels on the same axis', function () {
      const chart = _.cloneDeep(baseChart);
      initYAxis(chart);
      expect(chart).to.have.property('yAxisLabel', '');
    });
  });
});
