import splitByEverything from '../split_by_everything';
import { expect } from 'chai';
import sinon from 'sinon';

describe('splitByEverything(req, panel, series)', () => {

  let panel;
  let series;
  let req;
  beforeEach(() => {
    panel = {};
    series = { id: 'test', split_mode: 'everything' };
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
    splitByEverything(req, panel, series)(next)({});
    expect(next.calledOnce).to.equal(true);
  });

  it('returns a valid filter with match_all', () => {
    const next = doc => doc;
    const doc = splitByEverything(req, panel, series)(next)({});
    expect(doc).to.eql({
      aggs: {
        test: {
          filter: {
            match_all: {}
          }
        }
      }
    });
  });

  it('calls next and does not add a filter', () => {
    series.split_mode = 'terms';
    series.terms_field = 'host';
    const next = sinon.spy(doc => doc);
    const doc = splitByEverything(req, panel, series)(next)({});
    expect(next.calledOnce).to.equal(true);
    expect(doc).to.eql({});
  });

});
