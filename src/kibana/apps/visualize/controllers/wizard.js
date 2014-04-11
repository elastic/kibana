define(function (require) {
  var _ = require('lodash');

  require('../saved_visualizations/saved_visualizations');
  require('notify/notify');
  require('saved_object/finder.directive');
  require('apps/discover/saved_searches/saved_searches');

  var app = require('modules').get('app/visualize', [
    'kibana/notify',
    'kibana/courier'
  ]);

  app.controller('VisualizeWizard', function ($route, $scope, courier, createNotifier, config, $location, savedSearches) {
    var notify = createNotifier({
      location: 'Visualization Wizard'
    });

    $scope.savedSearches = savedSearches;
  });
});