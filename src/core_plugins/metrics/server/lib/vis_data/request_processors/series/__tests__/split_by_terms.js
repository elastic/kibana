import splitByTerms from '../split_by_terms';
import { expect } from 'chai';
import sinon from 'sinon';

describe('splitByTerms(req, panel, series)', () => {

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
      metrics: [{ id: 'avgmetric', type: 'avg', field: 'cpu' }]
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
    splitByTerms(req, panel, series)(next)({});
    expect(next.calledOnce).to.equal(true);
  });

  it('returns a valid terms agg', () => {
    const next = doc => doc;
    const doc = splitByTerms(req, panel, series)(next)({});
    expect(doc).to.eql({
      aggs: {
        test: {
          terms: {
            field: 'host',
            order: {
              _count: 'desc'
            },
            size: 10
          }
        }
      }
    });
  });

  it('returns a valid terms agg sort by terms', () => {
    const next = doc => doc;
    series.terms_order_by = '_term';
    series.terms_direction = 'asc';
    const doc = splitByTerms(req, panel, series)(next)({});
    expect(doc).to.eql({
      aggs: {
        test: {
          terms: {
            field: 'host',
            order: {
              _term: 'asc'
            },
            size: 10
          }
        }
      }
    });
  });

  it('returns a valid terms agg with custom sort', () => {
    series.terms_order_by = 'avgmetric';
    const next = doc => doc;
    const doc = splitByTerms(req, panel, series)(next)({});
    expect(doc).to.eql({
      aggs: {
        test: {
          terms: {
            field: 'host',
            size: 10,
            order: {
              'avgmetric-SORT': 'desc'
            }
          },
          aggs: {
            'avgmetric-SORT': {
              avg: {
                field: 'cpu'
              }
            }
          }
        }
      }
    });
  });

  it('calls next and does not add a terms agg', () => {
    series.split_mode = 'everything';
    const next = sinon.spy(doc => doc);
    const doc = splitByTerms(req, panel, series)(next)({});
    expect(next.calledOnce).to.equal(true);
    expect(doc).to.eql({});
  });

});


