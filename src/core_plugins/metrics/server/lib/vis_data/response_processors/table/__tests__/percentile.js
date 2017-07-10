import percentile from '../percentile';
import { expect } from 'chai';
import sinon from 'sinon';

describe('percentile(resp, panel, series)', () => {
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
      metrics: [{
        id: 'pct',
        type: 'percentile',
        field: 'cpu',
        percentiles: [
          { id: '10-90', mode: 'band', value: 10, percentile: 90, shade: 0.2 },
          { id: '50', mode: 'line', value: 50 }
        ]
      }]
    };
    resp = {
      aggregations: {
        test: {
          timeseries: {
            buckets: [
              {
                key: 1,
                pct: {
                  values: {
                    '10.0': 1,
                    '50.0': 2.5,
                    '90.0': 5
                  }
                }
              },
              {
                key: 2,
                pct: {
                  values: {
                    '10.0': 1.2,
                    '50.0': 2.7,
                    '90.0': 5.3
                  }
                }
              }
            ]
          }
        }
      }
    };
  });

  it('calls next when finished', () => {
    const next = sinon.spy();
    percentile(resp, panel, series)(next)([]);
    expect(next.calledOnce).to.equal(true);
  });

  it('creates a series', () => {
    const next = results => results;
    const results = percentile(resp, panel, series)(next)([]);
    expect(results).to.have.length(3);

    expect(results[0]).to.have.property('id', '10-90:test');
    expect(results[0]).to.have.property('color', '#FF0000');
    expect(results[0]).to.have.property('fillBetween', '10-90:test:90');
    expect(results[0]).to.have.property('label', 'Percentile of cpu (10)');
    expect(results[0]).to.have.property('legend', false);
    expect(results[0]).to.have.property('lines');
    expect(results[0].lines).to.eql({
      fill: 0.2,
      lineWidth: 0,
      show: true,
    });
    expect(results[0]).to.have.property('points');
    expect(results[0].points).to.eql({ show: false });
    expect(results[0].data).to.eql([
      [1,1],
      [2,1.2]
    ]);

    expect(results[1]).to.have.property('id', '10-90:test:90');
    expect(results[1]).to.have.property('color', '#FF0000');
    expect(results[1]).to.have.property('label', 'Percentile of cpu (10)');
    expect(results[1]).to.have.property('legend', false);
    expect(results[1]).to.have.property('lines');
    expect(results[1].lines).to.eql({
      fill: false,
      lineWidth: 0,
      show: true,
    });
    expect(results[1]).to.have.property('points');
    expect(results[1].points).to.eql({ show: false });
    expect(results[1].data).to.eql([
      [1,5],
      [2,5.3]
    ]);

    expect(results[2]).to.have.property('id', '50:test');
    expect(results[2]).to.have.property('color', '#FF0000');
    expect(results[2]).to.have.property('label', 'Percentile of cpu (50)');
    expect(results[2]).to.have.property('stack', false);
    expect(results[2]).to.have.property('lines');
    expect(results[2].lines).to.eql({
      fill: 0,
      lineWidth: 1,
      show: true,
      steps: false
    });
    expect(results[2]).to.have.property('bars');
    expect(results[2].bars).to.eql({
      fill: 0,
      lineWidth: 1,
      show: false
    });
    expect(results[2]).to.have.property('points');
    expect(results[2].points).to.eql({ show: true, lineWidth: 1, radius: 1 });
    expect(results[2].data).to.eql([
      [1,2.5],
      [2,2.7]
    ]);


  });

});

