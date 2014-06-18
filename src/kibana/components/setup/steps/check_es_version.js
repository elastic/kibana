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
        if (versionmath.is('>=' + minimumElasticsearchVersion, versions)) return true;
        else throw SetupError('This version of Kibana requires at least Elasticsearch ' + minimumElasticsearchVersion);
      })
      .then(complete, complete.failure);
    };
  };
});