var _ = require('lodash');
var Promise = require('bluebird');
var sinon = require('sinon');

var checkEsVersion = require('../check_es_version');

describe('plugins/elasticsearch', function () {
  describe('lib/check_es_version', function () {
    var server;
    var plugin;

    beforeEach(function () {
      var get = sinon.stub().withArgs('elasticserach.minimumVerison').returns('1.4.3');
      var config = function () { return { get: get }; };
      server = {
        log: _.noop,
        config: config,
        plugins: {
          elasticsearch: {
            client: {
              nodes: {}
            },
            status: {
              red: sinon.stub()
            }
          }
        }
      };
    });

    function setNodes(/* ...versions */) {
      var versions = _.shuffle(arguments);
      var nodes = {};
      var i = 0;

      while (versions.length) {
        var name = 'node-' + (++i);
        var version = versions.shift();

        var node = {
          version: version,
          http_address: 'http_address',
          ip: 'ip'
        };

        if (!_.isString(version)) _.assign(node, version);
        nodes[name] = node;
      }

      var client = server.plugins.elasticsearch.client;
      client.nodes.info = sinon.stub().returns(Promise.resolve({ nodes: nodes }));

    }

    it('passes with single a node that matches', function () {
      setNodes('1.4.3');
      return checkEsVersion(server);
    });

    it('passes with multiple nodes that satisfy', function () {
      setNodes('1.4.3', '1.4.4', '1.4.3-Beta1');
      return checkEsVersion(server);
    });

    it('fails with a single node that is out of date', function () {
      setNodes('1.4.4', '1.4.2', '1.4.5');
      return checkEsVersion(server)
      .then(function () {
        throw new Error('expected validation to fail');
      }, _.noop);
    });

    it('passes if that single node is a client node', function () {
      setNodes(
        '1.4.4',
        { version: '1.4.2', attributes: { client: 'true' } },
        '1.4.5'
      );

      return checkEsVersion(server);
    });

  });
});
