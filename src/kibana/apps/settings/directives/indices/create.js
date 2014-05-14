define(function (require) {
  require('routes').when('/settings/indices/', {
    template: require('text!../../partials/indices/create.html')
  });

  require('modules').get('app/settings')
  .controller('kbnSettingsIndicesCreate', function ($scope, courier, $location, Notifier, Private) {
    var notify = new Notifier();
    var refreshKibanaIndex = Private(require('./_refresh_kibana_index'));
    var MissingIndices = courier.indexPatterns.errors.MissingIndices;

    $scope.create = function () {
      // get an empty indexPattern to start
      courier.indexPatterns.get()
      .then(function (indexPattern) {
        // set both the id and title to the index pattern
        indexPattern.id = indexPattern.title = $scope.newIndexPattern;

        // fetch the fields
        return indexPattern.refreshFields()
        .then(refreshKibanaIndex)
        .then(function () {
          courier.indexPatterns.cache.clear(indexPattern.id);
          $location.url('/settings/indices/' + indexPattern.id);
        });

        // refreshFields calls save() after a successfull fetch, no need to save again
        // .then(function () { indexPattern.save(); })
      })
      .catch(function (err) {
        if (err instanceof MissingIndices) {
          notify.error('Could not locate any indices matching that pattern. Please add the index to Elasticsearch');
        }
        else notify.fatal(err);
      });
    };
  });
});