define(function (require) {
  var app = require('modules').get('app/visualize');

  function VisualizationsService(es, courier, $q, $timeout) {
    this.get = function (id) {
      var defer = $q.defer();

      $timeout(function () {
        defer.reject('not implemented');
      }, 2000);

      return defer.promise();
    };
  }

  app.service('Visualizations', VisualizationsService);
});