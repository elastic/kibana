define(function (require) {
  return function CreateKibanaIndexFn(Private, es, configFile, Notifier) {
    return function createKibanaIndex() {
      var notify = new Notifier({ location: 'Setup: Kibana Index Creation' });
      var complete = notify.lifecycle('kibana index creation');
      var SetupError = Private(require('components/setup/_setup_error'));

      return es.indices.create({
        index: configFile.kibana_index,
        body: {
          settings: {
            number_of_shards : 1
          }
        }
      })
      .catch(function (err) {
        throw new SetupError('Unable to create Kibana index "<%= configFile.kibana_index %>"', err);
      })
      .then(function () {
        return es.cluster.health({
          waitForStatus: 'yellow',
          index: configFile.kibana_index
        })
        .catch(function (err) {
          throw new SetupError('Waiting for Kibana index "<%= configFile.kibana_index %>" to come online failed', err);
        });
      })
      .then(complete, complete.failure);
    };
  };
});
