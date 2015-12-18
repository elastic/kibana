var _ = require('lodash');
var esBool = require('./es_bool');
var versionSatisfies = require('./version_satisfies');
var SetupError = require('./setup_error');

module.exports = function (server) {
  server.log(['plugin', 'debug'], 'Checking Elasticsearch version');

  var client = server.plugins.elasticsearch.client;
  var engineVersion = server.config().get('elasticsearch.engineVersion');

  return client.nodes.info()
  .then(function (info) {
    var badNodes = _.filter(info.nodes, function (node) {
      // remove client (non-master and non-data) nodes from the check
      var attrs = _.get(node, 'attributes');
      if (attrs && !esBool(attrs.master) && !esBool(attrs.data)) {
        return false;
      }

      // remove nodes that satify required engine version
      return !versionSatisfies(node.version, engineVersion);
    });

    if (!badNodes.length) return true;

    var badNodeNames = badNodes.map(function (node) {
      return 'Elasticsearch v' + node.version + ' @ ' + node.http_address + ' (' + node.ip + ')';
    });

    var message = `This version of Kibana requires Elasticsearch ` +
    `${engineVersion} on all nodes. I found ` +
    `the following incompatible nodes in your cluster: ${badNodeNames.join(',')}`;

    throw new SetupError(server, message);
  });
};
