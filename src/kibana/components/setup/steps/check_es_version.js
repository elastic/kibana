define(function (require) {
  return function CheckEsVersionFn(Private, es, configFile, Notifier, minimumElasticsearchVersion) {

    var _ = require('lodash');
    var versionmath = require('utils/versionmath');
    var esBool = require('utils/esBool');
    var notify = new Notifier({
      location: 'Setup: Elasticsearch version check'
    });

    return notify.timed(function checkEsVersion() {
      var SetupError = Private(require('components/setup/_setup_error'));

      return es.nodes.info()
      .then(function (info) {
        var badNodes = _.filter(info.nodes, function (node) {
          // remove client nodes (Logstash)
          var isClient = _.get(node, 'attributes.client');
          if (isClient != null && esBool(isClient) === true) {
            return false;
          }

          // remove nodes that are gte the min version
          var v = node.version.split('-')[0];
          return !versionmath.gte(minimumElasticsearchVersion, v);
        });

        if (!badNodes.length) return true;

        var badNodeNames = badNodes.map(function (node) {
          return 'Elasticsearch v' + node.version + ' @ ' + node.http_address + ' (' + node.ip + ')';
        });

        throw SetupError(
          'This version of Kibana requires Elasticsearch ' +
          minimumElasticsearchVersion + ' or higher on all nodes. ' +
          'I found the following incompatible nodes in your cluster: \n\n' +
          badNodeNames.join('\n')
        );
      });
    });
  };
});