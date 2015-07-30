describe('makeFakeXAspect', function () {

  var makeFakeXAspect;
  var Vis;
  var AggType;
  var AggConfig;
  var indexPattern;
  var expect = require('expect.js');
  var ngMock = require('ngMock');

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    Vis = Private(require('ui/Vis'));
    AggConfig = Private(require('ui/Vis/AggConfig'));
    AggType = Private(require('ui/agg_types/AggType'));
    indexPattern = Private(require('ui/Vis'));
    makeFakeXAspect = Private(require('ui/agg_response/point_series/_fake_x_aspect'));
  }));

  it('creates an object that looks like an aspect', function () {
    var vis = new Vis(indexPattern, { type: 'histogram' });
    var aspect = makeFakeXAspect(vis);

    expect(aspect)
      .to.have.property('i', -1)
      .and.have.property('agg')
      .and.have.property('col');

    expect(aspect.agg)
      .to.be.an(AggConfig)
      .and.to.have.property('type');

    expect(aspect.agg.type)
      .to.be.an(AggType)
      .and.to.have.property('name', 'all')
      .and.to.have.property('title', 'All docs')
      .and.to.have.property('hasNoDsl', true);

    expect(aspect.col)
      .to.be.an('object')
      .and.to.have.property('aggConfig', aspect.agg)
      .and.to.have.property('label', aspect.agg.makeLabel());
  });
});
