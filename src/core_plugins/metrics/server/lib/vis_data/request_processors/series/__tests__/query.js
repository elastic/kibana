import query from '../query';
import { expect } from 'chai';
import sinon from 'sinon';

describe('query(req, panel, series)', () => {

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
      time_field: 'timestamp',
      interval: '10s'
    };
    series = { id: 'test' };
  });

  it('calls next when finished', () => {
    const next = sinon.spy();
    query(req, panel, series)(next)({});
    expect(next.calledOnce).to.equal(true);
  });

  it('returns doc with query for timerange', () => {
    const next = doc => doc;
    const doc = query(req, panel, series)(next)({});
    expect(doc).to.eql({
      size: 0,
      query: {
        bool: {
          must: [
            {
              range: {
                timestamp: {
                  gte: 1483228800000,
                  lte: 1483232390000,
                  format: 'epoch_millis'
                }
              }
            }
          ]
        }
      }
    });
  });

  it('returns doc with query for timerange (offset by 1h)', () => {
    series.offset_time = '1h';
    const next = doc => doc;
    const doc = query(req, panel, series)(next)({});
    expect(doc).to.eql({
      size: 0,
      query: {
        bool: {
          must: [
            {
              range: {
                timestamp: {
                  gte: 1483225200000,
                  lte: 1483228790000,
                  format: 'epoch_millis'
                }
              }
            }
          ]
        }
      }
    });
  });

  it('returns doc with global query', () => {
    req.payload.filters = [
      {
        bool: {
          must: [
            {
              term: {
                host: 'example'
              }
            }
          ]
        }
      }
    ];
    const next = doc => doc;
    const doc = query(req, panel, series)(next)({});
    expect(doc).to.eql({
      size: 0,
      query: {
        bool: {
          must: [
            {
              range: {
                timestamp: {
                  gte: 1483228800000,
                  lte: 1483232390000,
                  format: 'epoch_millis'
                }
              }
            },
            {
              bool: {
                must: [
                  {
                    term: {
                      host: 'example'
                    }
                  }
                ]
              }
            }
          ]
        }
      }
    });
  });

  it('returns doc with panel filter and global', () => {
    req.payload.filters = [
      {
        bool: {
          must: [
            {
              term: {
                host: 'example'
              }
            }
          ]
        }
      }
    ];
    panel.filter = 'host:web-server';
    const next = doc => doc;
    const doc = query(req, panel, series)(next)({});
    expect(doc).to.eql({
      size: 0,
      query: {
        bool: {
          must: [
            {
              range: {
                timestamp: {
                  gte: 1483228800000,
                  lte: 1483232390000,
                  format: 'epoch_millis'
                }
              }
            },
            {
              bool: {
                must: [
                  {
                    term: {
                      host: 'example'
                    }
                  }
                ]
              }
            },
            {
              query_string: {
                query: panel.filter,
                analyze_wildcard: true
              }
            }
          ]
        }
      }
    });
  });

  it('returns doc with panel filter (ignoring globals)', () => {
    req.payload.filters = [
      {
        bool: {
          must: [
            {
              term: {
                host: 'example'
              }
            }
          ]
        }
      }
    ];
    panel.filter = 'host:web-server';
    panel.ignore_global_filter = true;
    const next = doc => doc;
    const doc = query(req, panel, series)(next)({});
    expect(doc).to.eql({
      size: 0,
      query: {
        bool: {
          must: [
            {
              range: {
                timestamp: {
                  gte: 1483228800000,
                  lte: 1483232390000,
                  format: 'epoch_millis'
                }
              }
            },
            {
              query_string: {
                query: panel.filter,
                analyze_wildcard: true
              }
            }
          ]
        }
      }
    });
  });


});

