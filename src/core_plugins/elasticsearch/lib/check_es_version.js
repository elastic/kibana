/**
 * ES and Kibana versions are locked, so Kibana should require that ES has the same version as
 * that defined in Kibana's package.json.
 */

import _ from 'lodash';
import esBool from './es_bool';
import semver from 'semver';
import isEsCompatibleWithKibana from './is_es_compatible_with_kibana';
import SetupError from './setup_error';

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

      // It's acceptable if ES is ahead of Kibana, but we want to prompt users to upgrade Kibana
      // to match it.
      if (semver.gt(esNode.version, kibanaVersion)) {
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

      server.log(['warning'], {
        tmpl: (
          'You\'re running Kibana <%= kibanaVersion %> with some newer versions of ' +
          'Elasticsearch. Update Kibana to the latest version to prevent compatibility issues: ' +
          '<%= getHumanizedNodeNames(nodes).join(", ") %>'
        ),
        kibanaVersion,
        getHumanizedNodeNames,
        nodes: simplifiedNodes,
      });
    }

    if (incompatibleNodes.length) {
      const incompatibleNodeNames = getHumanizedNodeNames(incompatibleNodes);

      const errorMessage =
        `This version of Kibana requires Elasticsearch v` +
        `${kibanaVersion} on all nodes. I found ` +
        `the following incompatible nodes in your cluster: ${incompatibleNodeNames.join(',')}`;

      throw new SetupError(server, errorMessage);
    }

    return true;
  });
};
