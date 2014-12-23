define(function (require) {
  return function checkForEsFunction(Private, Notifier, es, configFile) {
    var SetupError = Private(require('components/setup/_setup_error'));
    var notify = new Notifier({ location: 'Setup: Elasticsearch check' });

    return function checkForES() {
      var complete = notify.lifecycle('es check');
      return es.info({
        method: 'GET'
      })
      .catch(function (err) {
        if (err.body && err.body.message) {
          throw new SetupError(err.body.message, err);
        } else {
          throw new SetupError('Unknown error while connecting to Elasticsearch', err);
        }
      })
      .then(complete, complete.failure);
    };
  };
});