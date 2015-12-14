describe('addToSiri', function () {
  var expect = require('expect.js');
  var ngMock = require('ngMock');
  var addToSiri;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    addToSiri = Private(require('ui/agg_response/point_series/_add_to_siri'));
  }));

  it('creates a new series the first time it sees an id', function () {
    var series = new Map();
    var point = {};
    var id = 'id';
    addToSiri(series, point, id);

    expect(series.has(id)).to.be(true);
    expect(series.get(id)).to.be.an('object');
    expect(series.get(id).label).to.be(id);
    expect(series.get(id).values).to.have.length(1);
    expect(series.get(id).values[0]).to.be(point);
  });

  it('adds points to existing series if id has been seen', function () {
    var series = new Map();
    var id = 'id';

    var point = {};
    addToSiri(series, point, id);

    var point2 = {};
    addToSiri(series, point2, id);

    expect(series.has(id)).to.be(true);
    expect(series.get(id)).to.be.an('object');
    expect(series.get(id).label).to.be(id);
    expect(series.get(id).values).to.have.length(2);
    expect(series.get(id).values[0]).to.be(point);
    expect(series.get(id).values[1]).to.be(point2);
  });

  it('allows overriding the series label', function () {
    var series = new Map();
    var id = 'id';
    var label = 'label';
    var point = {};
    addToSiri(series, point, id, label);

    expect(series.has(id)).to.be(true);
    expect(series.get(id)).to.be.an('object');
    expect(series.get(id).label).to.be(label);
    expect(series.get(id).values).to.have.length(1);
    expect(series.get(id).values[0]).to.be(point);
  });
});
