define(function (require) {
  return function checkForEsFunction(Private, Notifier, es, configFile) {
    var SetupError = Private(require('components/setup/_setup_error'));
    var notify = new Notifier({ location: 'Setup: Elasticsearch check' });

    return function checkForES() {
      var complete = notify.lifecycle('es check');
      return es.ping({
        requestTimeout: 2000
      })
      .catch(function (err) {
        throw new SetupError('Unable to connect to Elasticsearch at "<%= configFile.elasticsearch %>"', err);
      })
      .then(complete, complete.failure);
    };
  };
});