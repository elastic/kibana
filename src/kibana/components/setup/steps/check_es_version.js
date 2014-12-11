define(function (require) {
  var _ = require('lodash');
  var versionmath = require('utils/versionmath');
  return function CheckEsVersionFn(Private, es, configFile, Notifier, minimumElasticsearchVersion) {
    return function checkEsVersion() {
      var notify = new Notifier({ location: 'Setup: Elasticsearch version check' });
      var complete = notify.lifecycle('check es version');

      var SetupError = Private(require('components/setup/_setup_error'));

      return es.nodes.info()
      .then(function (info) {
        var versions = _.map(info.nodes, function (v) {
          // Remove everything after the -, we don't handle beta/rc ES versions
          return v.version.split('-')[0];
        });
        if (versionmath.is('>=' + minimumElasticsearchVersion, versions)) {
          return true;
        }
        else {
          var badNodes = _.map(info.nodes, function (v) {
            if (versionmath.is('<' + minimumElasticsearchVersion, [v.version.split('-')[0]])) {
              return 'Elasticsearch ' + v.version + ' @ ' + v.transport_address + ' (' + v.ip + ')';
            }
          });
          throw SetupError('This version of Kibana requires Elasticsearch ' + minimumElasticsearchVersion + ' or higher on all nodes. ' +
            'I found the following incompatible nodes in your cluster: \n\n' + badNodes.join('\n'));
        }
      })
      .then(complete, complete.failure);
    };
  };
});