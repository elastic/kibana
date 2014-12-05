define(function (require) {
  return function CheckForKibanaIndexFn(Private, es, Notifier, configFile) {
    var SetupError = Private(require('components/setup/_setup_error'));
    var notify = new Notifier({ location: 'Setup: Kibana index check' });

    return function checkForKibana() {
      var complete = notify.lifecycle('kibana index check');
      return es.indices.exists({
        index: configFile.kibana_index
      })
      .catch(function (err) {
        throw new SetupError('Unable to check for Kibana index "<%= configFile.kibana_index %>"', err);
      })
      .then(complete, complete.failure);
    };
  };
});
