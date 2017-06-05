import splitByFilter from '../split_by_filter';
import { expect } from 'chai';
import sinon from 'sinon';

describe('splitByFilter(req, panel, series)', () => {

  let panel;
  let series;
  let req;
  beforeEach(() => {
    panel = {};
    series = { id: 'test', split_mode: 'filter', filter: 'host:example-01' };
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
    splitByFilter(req, panel, series)(next)({});
    expect(next.calledOnce).to.equal(true);
  });

  it('returns a valid filter with a query_string', () => {
    const next = doc => doc;
    const doc = splitByFilter(req, panel, series)(next)({});
    expect(doc).to.eql({
      aggs: {
        test: {
          filter: {
            query_string: {
              query: 'host:example-01',
              analyze_wildcard: true
            }
          }
        }
      }
    });
  });

  it('calls next and does not add a filter', () => {
    series.split_mode = 'terms';
    const next = sinon.spy(doc => doc);
    const doc = splitByFilter(req, panel, series)(next)({});
    expect(next.calledOnce).to.equal(true);
    expect(doc).to.eql({});
  });

});

