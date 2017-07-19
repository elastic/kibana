import expect from 'expect.js';
import ngMock from 'ng_mock';
import { PointSeriesAddToSiriProvider } from 'ui/agg_response/point_series/_add_to_siri';

describe('addToSiri', function () {
  let addToSiri;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    addToSiri = Private(PointSeriesAddToSiriProvider);
  }));

  it('creates a new series the first time it sees an id', function () {
    const series = new Map();
    const point = {};
    const id = 'id';
    addToSiri(series, point, id, id, { id: id });

    expect(series.has(id)).to.be(true);
    expect(series.get(id)).to.be.an('object');
    expect(series.get(id).label).to.be(id);
    expect(series.get(id).values).to.have.length(1);
    expect(series.get(id).values[0]).to.be(point);
  });

  it('adds points to existing series if id has been seen', function () {
    const series = new Map();
    const id = 'id';

    const point = {};
    addToSiri(series, point, id, id, { id: id });

    const point2 = {};
    addToSiri(series, point2, id, id, { id: id });

    expect(series.has(id)).to.be(true);
    expect(series.get(id)).to.be.an('object');
    expect(series.get(id).label).to.be(id);
    expect(series.get(id).values).to.have.length(2);
    expect(series.get(id).values[0]).to.be(point);
    expect(series.get(id).values[1]).to.be(point2);
  });

  it('allows overriding the series label', function () {
    const series = new Map();
    const id = 'id';
    const label = 'label';
    const point = {};
    addToSiri(series, point, id, label, { id: id });

    expect(series.has(id)).to.be(true);
    expect(series.get(id)).to.be.an('object');
    expect(series.get(id).label).to.be(label);
    expect(series.get(id).values).to.have.length(1);
    expect(series.get(id).values[0]).to.be(point);
  });
});
