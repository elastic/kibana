define(function (require) {
  return function CreateKibanaIndexFn(Private, es, configFile, Notifier) {
    return function createKibanaIndex() {
      var notify = new Notifier({ location: 'Setup: Kibana Index Creation' });
      var complete = notify.lifecycle('kibana index creation');
      var SetupError = Private(require('components/setup/_setup_error'));

      return es.indices.create({
        index: configFile.kibanaIndex,
        body: {
          settings: {
            number_of_shards : 1,
            number_of_replicas: 1
          }
        }
      })
      .catch(function (err) {
        throw new SetupError('Unable to create Kibana index "<%= configFile.kibanaIndex %>"', err);
      })
      .then(function () {
        return es.cluster.health({
          waitForStatus: 'yellow',
          index: configFile.kibanaIndex
        })
        .catch(function (err) {
          throw new SetupError('Waiting for Kibana index "<%= configFile.kibanaIndex %>" to come online failed', err);
        });
      })
      .then(complete, complete.failure);
    };
  };
});