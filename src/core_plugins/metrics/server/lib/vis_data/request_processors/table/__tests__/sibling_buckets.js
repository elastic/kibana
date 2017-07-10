import siblingBuckets from '../sibling_buckets';
import { expect } from 'chai';
import sinon from 'sinon';

describe('siblingBuckets(req, panel, series)', () => {

  let panel;
  let series;
  let req;
  beforeEach(() => {
    panel = {
      time_field: 'timestamp'
    };
    series = {
      id: 'test',
      split_mode: 'terms',
      terms_size: 10,
      terms_field: 'host',
      metrics: [
        {
          id: 'metric-1',
          type: 'avg',
          field: 'cpu'
        },
        {
          id: 'metric-2',
          type: 'avg_bucket',
          field: 'metric-1'
        }
      ]
    };
    req = {
      payload: {
        timerange: {
          min: '2017-01-01T00:00:00Z',
          max: '2017-01-01T01:00:00Z'
        }
      }
    };
  });

  it('calls next when finished', () => {
    const next = sinon.spy();
    siblingBuckets(req, panel, series)(next)({});
    expect(next.calledOnce).to.equal(true);
  });

  it('returns sibling aggs', () => {
    const next = doc => doc;
    const doc = siblingBuckets(req, panel, series)(next)({});
    expect(doc).to.eql({
      aggs: {
        test: {
          aggs: {
            'metric-2': {
              extended_stats_bucket: {
                buckets_path: 'timeseries > metric-1'
              }
            }
          }
        }
      }
    });

  });
});


