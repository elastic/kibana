import splitByFilters from '../split_by_filters';
import { expect } from 'chai';
import sinon from 'sinon';

describe('splitByFilters(req, panel, series)', () => {

  let panel;
  let series;
  let req;
  beforeEach(() => {
    panel = {
      time_field: 'timestamp'
    };
    series = {
      id: 'test',
      split_mode: 'filters',
      split_filters: [
        {
          id: 'filter-1',
          color: '#F00',
          filter: 'status_code:[* TO 200]',
          label: '200s'
        },
        {
          id: 'filter-2',
          color: '#0F0',
          filter: 'status_code:[300 TO *]',
          label: '300s'
        }

      ],
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
    splitByFilters(req, panel, series)(next)({});
    expect(next.calledOnce).to.equal(true);
  });

  it('returns a valid terms agg', () => {
    const next = doc => doc;
    const doc = splitByFilters(req, panel, series)(next)({});
    expect(doc).to.eql({
      aggs: {
        test: {
          filters: {
            filters: {
              'filter-1': {
                query_string: {
                  query: 'status_code:[* TO 200]',
                  analyze_wildcard: true
                }
              },
              'filter-2': {
                query_string: {
                  query: 'status_code:[300 TO *]',
                  analyze_wildcard: true
                }
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
    const doc = splitByFilters(req, panel, series)(next)({});
    expect(next.calledOnce).to.equal(true);
    expect(doc).to.eql({});
  });

});



