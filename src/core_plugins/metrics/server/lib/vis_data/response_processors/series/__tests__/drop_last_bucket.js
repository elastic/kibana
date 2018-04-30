import { expect } from 'chai';
import { dropLastBucket } from '../drop_last_bucket';

describe('dropLastBucket(resp, panel, series)', () => {
  let panel;
  let series;
  let resp;

  beforeEach(() => {
    panel = {
      time_field: 'timestamp',
      mode: 'last',
      interval: '1m'
    };
    series = {
      id: 'test',
      chart_type: 'line',
      stacked: false,
      line_width: 1,
      point_size: 1,
      fill: 0,
      color: '#F00',
      split_mode: 'everything',
      metrics: [{
        id: 'stddev',
        mode: 'raw',
        type: 'std_deviation',
        field: 'cpu'
      }]
    };
    resp = {
      aggregations: {
        test: {
          meta: {
            bucketSize: 60,
            from: '2018-01-01T07:26:00.000Z',
            intervalString: '1m',
            timeField: '@timestamp',
            to: '2018-01-01T07:31:00.000Z',
          }
        }
      }
    };
  });


  it('should drop the last partial bucktet', () => {
    const next = value => value;
    const results = [
      {
        data: [
          [ 1514791500000, 0 ],
          [ 1514791560000, 0 ],
          [ 1514791620000, 0 ],
          [ 1514791680000, 0 ],
          [ 1514791740000, 0 ],
          [ 1514791800000, 0 ],
          [ 1514791860000, 0 ]
        ]
      }
    ];
    const data = dropLastBucket(resp, panel, series)(next)(results);
    expect(data).to.eql([
      {
        data: [
          [ 1514791560000, 0 ],
          [ 1514791620000, 0 ],
          [ 1514791680000, 0 ],
          [ 1514791740000, 0 ],
          [ 1514791800000, 0 ]
        ]
      }
    ]);
  });

});

