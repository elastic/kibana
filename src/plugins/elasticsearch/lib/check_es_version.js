var _ = require('lodash');
var esBool = require('./es_bool');
var versionMath = require('./version_math');
var SetupError = require('./setup_error');

module.exports = function (server) {
  server.log(['plugin', 'debug'], 'Checking Elasticsearch version');

  var client = server.plugins.elasticsearch.client;
  var minimumElasticsearchVersion = server.config().get('elasticsearch.minimumVerison');

  return client.nodes.info()
  .then(function (info) {
    var badNodes = _.filter(info.nodes, function (node) {
      // remove client nodes (Logstash)
      var isClient = _.get(node, 'attributes.client');
      if (isClient != null && esBool(isClient) === true) {
        return false;
      }

      // remove nodes that are gte the min version
      var v = node.version.split('-')[0];
      return !versionMath.gte(minimumElasticsearchVersion, v);
    });

    if (!badNodes.length) return true;

    var badNodeNames = badNodes.map(function (node) {
      return 'Elasticsearch v' + node.version + ' @ ' + node.http_address + ' (' + node.ip + ')';
    });

    var message = `This version of Kibana requires Elasticsearch ` +
    `${minimumElasticsearchVersion} or higher on all nodes. I found ` +
    `the following incompatible nodes in your cluster: ${badNodeNames.join(',')}`;

    throw new SetupError(server, message);
  });
};
