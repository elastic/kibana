import sinon from 'sinon';
import { expect } from 'chai';
import stdMetric from '../std_metric';

describe('stdMetric(resp, panel, series)', () => {
  let panel;
  let series;
  let resp;
  beforeEach(() => {
    panel = {
      time_field: 'timestamp'
    };
    series = {
      chart_type: 'line',
      stacked: false,
      line_width: 1,
      point_size: 1,
      fill: 0,
      color: '#F00',
      id: 'test',
      split_mode: 'everything',
      metrics: [{ id: 'avgmetric', type: 'avg', field: 'cpu' }]
    };
    resp = {
      aggregations: {
        test: {
          timeseries: {
            buckets: [
              {
                key: 1,
                avgmetric: { value: 1 }
              },
              {
                key: 2,
                avgmetric: { value: 2 }
              }
            ]
          }
        }
      }
    };
  });

  it('calls next when finished', () => {
    const next = sinon.spy();
    stdMetric(resp, panel, series)(next)([]);
    expect(next.calledOnce).to.equal(true);
  });

  it('calls next when finished (percentile)', () => {
    series.metrics[0].type = 'percentile';
    const next = sinon.spy(d => d);
    const results = stdMetric(resp, panel, series)(next)([]);
    expect(next.calledOnce).to.equal(true);
    expect(results).to.have.length(0);
  });

  it('calls next when finished (std_deviation band)', () => {
    series.metrics[0].type = 'std_deviation';
    series.metrics[0].mode = 'band';
    const next = sinon.spy(d => d);
    const results = stdMetric(resp, panel, series)(next)([]);
    expect(next.calledOnce).to.equal(true);
    expect(results).to.have.length(0);
  });

  it('creates a series', () => {
    const next = results => results;
    const results = stdMetric(resp, panel, series)(next)([]);
    expect(results).to.have.length(1);
    expect(results[0]).to.have.property('color', '#FF0000');
    expect(results[0]).to.have.property('id', 'test');
    expect(results[0]).to.have.property('label', 'Average of cpu');
    expect(results[0]).to.have.property('lines');
    expect(results[0]).to.have.property('stack');
    expect(results[0]).to.have.property('bars');
    expect(results[0]).to.have.property('points');
    expect(results[0].data).to.eql([ [1,1], [2,2] ]);
  });

});
