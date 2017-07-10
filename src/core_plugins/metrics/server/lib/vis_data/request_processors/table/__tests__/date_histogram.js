import dateHistogram from '../date_histogram';
import { expect } from 'chai';
import sinon from 'sinon';

describe('dateHistogram(req, panel, series)', () => {

  let panel;
  let series;
  let req;
  beforeEach(() => {
    req = {
      payload: {
        timerange: {
          min: '2017-01-01T00:00:00Z',
          max: '2017-01-01T01:00:00Z'
        }
      }
    };
    panel = {
      index_pattern: '*',
      time_field: '@timestamp',
      interval: '10s'
    };
    series = { id: 'test' };
  });

  it('calls next when finished', () => {
    const next = sinon.spy();
    dateHistogram(req, panel, series)(next)({});
    expect(next.calledOnce).to.equal(true);
  });

  it('returns valid date histogram', () => {
    const next = doc => doc;
    const doc = dateHistogram(req, panel, series)(next)({});
    expect(doc).to.eql({
      aggs: {
        test: {
          aggs: {
            timeseries: {
              date_histogram: {
                field: '@timestamp',
                interval: '10s',
                min_doc_count: 0,
                extended_bounds: {
                  min: 1483228800000,
                  max: 1483232390000
                }
              }
            }
          }
        }
      }
    });
  });

  it('returns valid date histogram (offset by 1h)', () => {
    series.offset_time = '1h';
    const next = doc => doc;
    const doc = dateHistogram(req, panel, series)(next)({});
    expect(doc).to.eql({
      aggs: {
        test: {
          aggs: {
            timeseries: {
              date_histogram: {
                field: '@timestamp',
                interval: '10s',
                min_doc_count: 0,
                extended_bounds: {
                  min: 1483225200000,
                  max: 1483228790000
                }
              }
            }
          }
        }
      }
    });
  });

  it('returns valid date histogram with overriden index pattern', () => {
    series.override_index_pattern = 1;
    series.series_index_pattern = '*';
    series.series_time_field = 'timestamp';
    series.series_interval = '20s';
    const next = doc => doc;
    const doc = dateHistogram(req, panel, series)(next)({});
    expect(doc).to.eql({
      aggs: {
        test: {
          aggs: {
            timeseries: {
              date_histogram: {
                field: 'timestamp',
                interval: '20s',
                min_doc_count: 0,
                extended_bounds: {
                  min: 1483228800000,
                  max: 1483232380000
                }
              }
            }
          }
        }
      }
    });
  });

});
