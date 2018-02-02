import expect from 'expect.js';
import { MetricVisComponent } from '../metric_vis_controller';

describe('metric vis', function () {

  const vis = {
    params: {
      metric: {
        colorSchema: 'Green to Red',
        colorsRange: [
          { from: 0, to: 1000 }
        ],
        style: {}
      }
    }
  };

  const formatter = function (value) {
    return value.toFixed(3);
  };

  const aggConfig = {
    fieldFormatter: () => {
      return formatter;
    },
    schema: {}
  };

  let metricController;

  beforeEach(() => {
    metricController = new MetricVisComponent({ vis: vis });
  });

  it('should set the metric label and value', function () {
    const metrics = metricController._processTableGroups({
      tables: [{
        columns: [{ title: 'Count', aggConfig: { ...aggConfig, makeLabel: () => 'Count' } }],
        rows: [[ 4301021 ]]
      }]
    });

    expect(metrics.length).to.be(1);
    expect(metrics[0].label).to.be('Count');
    expect(metrics[0].value).to.be('4301021.000');
  });

  it('should support multi-value metrics', function () {
    const metrics = metricController._processTableGroups({
      tables: [{
        columns: [
          { aggConfig: { ...aggConfig, makeLabel: () => '1st percentile of bytes' } },
          { aggConfig: { ...aggConfig, makeLabel: () => '99th percentile of bytes' } }
        ],
        rows: [[ 182, 445842.4634666484 ]]
      }]
    });

    expect(metrics.length).to.be(2);
    expect(metrics[0].label).to.be('1st percentile of bytes');
    expect(metrics[0].value).to.be('182.000');
    expect(metrics[1].label).to.be('99th percentile of bytes');
    expect(metrics[1].value).to.be('445842.463');
  });
});
