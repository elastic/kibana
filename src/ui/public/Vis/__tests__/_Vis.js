describe('Vis Class', function () {

  var _ = require('lodash');
  var ngMock = require('ngMock');
  var expect = require('expect.js');

  var indexPattern;
  var Vis;
  var visTypes;

  var vis;
  var stateFixture = {
    type: 'pie',
    aggs: [
      { type: 'avg', schema: 'metric', params: { field: 'bytes' } },
      { type: 'terms', schema: 'segment', params: { field: 'machine.os' }},
      { type: 'terms', schema: 'segment', params: { field: 'geo.src' }}
    ],
    params: { isDonut: true },
    listeners: { click: _.noop }
  };

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    Vis = Private(require('ui/Vis'));
    indexPattern = Private(require('fixtures/stubbed_logstash_index_pattern'));
    visTypes = Private(require('ui/registry/vis_types'));
  }));

  beforeEach(function () {
    vis = new Vis(indexPattern, stateFixture);
  });

  var verifyVis = function (vis) {
    expect(vis).to.have.property('aggs');
    expect(vis.aggs).to.have.length(3);

    expect(vis).to.have.property('type');
    expect(vis.type).to.eql(visTypes.byName.pie);

    expect(vis).to.have.property('listeners');
    expect(vis.listeners).to.have.property('click');
    expect(vis.listeners.click).to.eql(_.noop);

    expect(vis).to.have.property('params');
    expect(vis.params).to.have.property('isDonut', true);
    expect(vis).to.have.property('indexPattern', indexPattern);
  };

  describe('initialization', function () {
    it('should set the state', function () {
      verifyVis(vis);
    });
  });

  describe('getState()', function () {
    it('should get a state that represents the... er... state', function () {
      var state = vis.getState();
      expect(state).to.have.property('type', 'pie');

      expect(state).to.have.property('params');
      expect(state.params).to.have.property('isDonut', true);

      expect(state).to.have.property('listeners');
      expect(state.listeners).to.have.property('click');
      expect(state.listeners.click).to.eql(_.noop);

      expect(state).to.have.property('aggs');
      expect(state.aggs).to.have.length(3);
    });
  });

  describe('clone()', function () {
    it('should make clone of itself', function () {
      var clone = vis.clone();
      verifyVis(clone);
    });
  });

  describe('setState()', function () {
    it('should set the state to defualts', function () {
      var vis = new Vis(indexPattern);
      expect(vis).to.have.property('type');
      expect(vis.type).to.eql(visTypes.byName.histogram);
      expect(vis).to.have.property('aggs');
      expect(vis.aggs).to.have.length(1);
      expect(vis).to.have.property('listeners');
      expect(vis.listeners).to.eql({});
      expect(vis).to.have.property('params');
      expect(vis.params).to.have.property('addLegend', true);
      expect(vis.params).to.have.property('addTooltip', true);
      expect(vis.params).to.have.property('mode', 'stacked');
      expect(vis.params).to.have.property('shareYAxis', true);
    });
  });

  describe('isHierarchical()', function () {
    it('should return true for hierarchical vis (like pie)', function () {
      expect(vis.isHierarchical()).to.be(true);
    });
    it('should return false for non-hierarchical vis (like histogram)', function () {
      var vis = new Vis(indexPattern);
      expect(vis.isHierarchical()).to.be(false);
    });
  });

});
