
var _ = require('lodash');
var fixtures = require('fixtures/fake_hierarchical_data');
var sinon = require('auto-release-sinon');
var expect = require('expect.js');
var ngMock = require('ngMock');

var Vis;
var Notifier;
var AggConfigs;
var indexPattern;
var buildSankey;

describe('sankey', function () {

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private, $injector) {
    Notifier = $injector.get('Notifier');
    sinon.stub(Notifier.prototype, 'error');

    Vis = Private(require('ui/Vis'));
    AggConfigs = Private(require('ui/Vis/AggConfigs'));
    indexPattern = Private(require('fixtures/stubbed_logstash_index_pattern'));
    buildSankey = Private(require('ui/agg_response/sankey/sankey'));
  }));

  describe('threeTermBuckets', function () {
    var vis;
    var results;

    beforeEach(function () {
      var id = 1;
      vis = new Vis(indexPattern, {
        type: 'sankey',
        aggs: [
          { type: 'count', schema: 'metric' },
          { type: 'terms', schema: 'segment', params: { field: 'extension' }},
          { type: 'terms', schema: 'segment', params: { field: 'machine.os' }},
          { type: 'terms', schema: 'segment', params: { field: 'geo.src' }}
        ]
      });
      // We need to set the aggs to a known value.
      _.each(vis.aggs, function (agg) { agg.id = 'agg_' + id++; });
      results = buildSankey(vis, fixtures.threeTermBuckets);
    });

    it('should have nodes and links attributes for the results', function () {
      expect(results).to.have.property('slices');
      expect(results.slices).to.have.property('nodes');
      expect(results.slices).to.have.property('links');
    });

    it('should have name attributes for the nodes array', function () {
      expect(results.slices.nodes).to.have.length(11);
      _.each(results.slices.nodes, function (item) {
        expect(item).to.have.property('name');
      });
      expect(results.slices.nodes[0].name).to.equal('png');
    });

    it('should have source, target and value attributes for the links array', function () {
      expect(results.slices.links).to.have.length(16);
      _.each(results.slices.links, function (item) {
        expect(item).to.have.property('source');
        expect(item).to.have.property('target');
        expect(item).to.have.property('value');
      });
      expect(results.slices.links[0].source).to.equal(0);
      expect(results.slices.links[0].target).to.equal(1);
      expect(results.slices.links[0].value).to.equal(10);
    });

  });

});
