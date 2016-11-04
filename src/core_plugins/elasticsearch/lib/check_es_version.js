/**
 * ES and Kibana versions are locked, so Kibana should require that ES has the same version as
 * that defined in Kibana's package.json.
 */

import _ from 'lodash';
import esBool from './es_bool';
import isEsCompatibleWithKibana from './is_es_compatible_with_kibana';

/**
 *  tracks the node descriptions that get logged in warnings so
 *  that we don't spam the log with the same message over and over.
 *
 *  There are situations, like in testing or multi-tenancy, where
 *  the server argument changes, so we must track the previous
 *  node warnings per server
 */
const lastWarnedNodesForServer = new WeakMap();

module.exports = function checkEsVersion(server, kibanaVersion) {
  server.log(['plugin', 'debug'], 'Checking Elasticsearch version');

  const client = server.plugins.elasticsearch.client;

  return client.nodes.info()
  .then(function (info) {
    // Aggregate incompatible ES nodes.
    const incompatibleNodes = [];

    // Aggregate ES nodes which should prompt a Kibana upgrade.
    const warningNodes = [];

    _.forEach(info.nodes, esNode => {
      if (!isEsCompatibleWithKibana(esNode.version, kibanaVersion)) {
        // Exit early to avoid collecting ES nodes with newer major versions in the `warningNodes`.
        return incompatibleNodes.push(esNode);
      }

      // It's acceptable if ES and Kibana versions are not the same so long as
      // they are not incompatible, but we should warn about it
      if (esNode.version !== kibanaVersion) {
        warningNodes.push(esNode);
      }
    });

    function getHumanizedNodeNames(nodes) {
      return nodes.map(node => {
        return 'v' + node.version + ' @ ' + node.http.publish_address + ' (' + node.ip + ')';
      });
    }

    if (warningNodes.length) {
      const simplifiedNodes = warningNodes.map(node => ({
        version: node.version,
        http: {
          publish_address: node.http.publish_address,
        },
        ip: node.ip,
      }));

      // Don't show the same warning over and over again.
      const warningNodeNames = getHumanizedNodeNames(simplifiedNodes).join(', ');
      if (lastWarnedNodesForServer.get(server) !== warningNodeNames) {
        lastWarnedNodesForServer.set(server, warningNodeNames);
        server.log(['warning'], {
          tmpl: (
            `You're running Kibana ${kibanaVersion} with some different versions of ` +
            'Elasticsearch. Update Kibana or Elasticsearch to the same ' +
            `version to prevent compatibility issues: ${warningNodeNames}`
          ),
          kibanaVersion,
          nodes: simplifiedNodes,
        });
      }
    }

    if (incompatibleNodes.length) {
      const incompatibleNodeNames = getHumanizedNodeNames(incompatibleNodes);
      throw new Error(
        `This version of Kibana requires Elasticsearch v` +
        `${kibanaVersion} on all nodes. I found ` +
        `the following incompatible nodes in your cluster: ${incompatibleNodeNames.join(',')}`
      );
    }

    return true;
  });
};
