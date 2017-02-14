import stdDeviationSibling from '../std_deviation_sibling';
import { expect } from 'chai';
import sinon from 'sinon';

describe('stdDeviationSibling(resp, panel, series)', () => {
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
      metrics: [
        {
          id: 'avgcpu',
          type: 'avg',
          field: 'cpu'
        },
        {
          id: 'sib',
          type: 'std_deviation_bucket',
          mode: 'band',
          field: 'avgcpu'
        }
      ]
    };
    resp = {
      aggregations: {
        test: {
          sib: {
            std_deviation: 0.23,
            std_deviation_bounds: {
              upper: 0.7,
              lower: 0.01
            }
          },
          timeseries: {
            buckets: [
              {
                key: 1,
                avgcpu: { value: 0.23 }
              },
              {
                key: 2,
                avgcpu: { value: 0.22 }
              }
            ]
          }
        }
      }
    };
  });

  it('calls next when finished', () => {
    const next = sinon.spy();
    stdDeviationSibling(resp, panel, series)(next)([]);
    expect(next.calledOnce).to.equal(true);
  });

  it('creates a series', () => {
    const next = results => results;
    const results = stdDeviationSibling(resp, panel, series)(next)([]);
    expect(results).to.have.length(2);

    expect(results[0]).to.eql({
      id: 'test:lower',
      color: '#FF0000',
      lines: { show: true, fill: false, lineWidth: 0 },
      points: { show: false },
      data: [
        [ 1, 0.01 ],
        [ 2, 0.01 ]
      ]
    });

    expect(results[1]).to.eql({
      id: 'test:upper',
      label: 'Overall Std. Deviation of Average of cpu',
      color: '#FF0000',
      fillBetween: 'test:lower',
      lines: { show: true, fill: 0.5, lineWidth: 0 },
      points: { show: false },
      data: [
        [ 1, 0.7 ],
        [ 2, 0.7 ]
      ]
    });

  });

});




