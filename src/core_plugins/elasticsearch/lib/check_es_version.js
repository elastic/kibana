import _ from 'lodash';
import esBool from './es_bool';
import versionSatisfies from './version_satisfies';
import SetupError from './setup_error';

module.exports = function (server) {
  server.log(['plugin', 'debug'], 'Checking Elasticsearch version');

  const client = server.plugins.elasticsearch.client;
  const engineVersion = server.config().get('elasticsearch.engineVersion');

  return client.nodes.info()
  .then(function (info) {
    const badNodes = _.filter(info.nodes, function (node) {
      // remove nodes that satify required engine version
      return !versionSatisfies(node.version, engineVersion);
    });

    if (!badNodes.length) return true;

    const badNodeNames = badNodes.map(function (node) {
      return 'Elasticsearch v' + node.version + ' @ ' + node.http_address + ' (' + node.ip + ')';
    });

    const message = `This version of Kibana requires Elasticsearch ` +
    `${engineVersion} on all nodes. I found ` +
    `the following incompatible nodes in your cluster: ${badNodeNames.join(',')}`;

    throw new SetupError(server, message);
  });
};
