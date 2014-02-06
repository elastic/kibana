define(function (require) {
  'use strict';
  var moment = require('moment');
  var transform = require('./transform');   
  var filterByName = require('./filterByName');
  var countChildren = require('./countChildren'); 
  var hasUnassigned = require('./hasUnassigned');
  var labels = require('./labels');
  var _ = require('lodash');

  // This function will update the state of the ui. It requires the $scope 
  // to be passed in as the first argument. 
  return function ($scope) {
    if ($scope.currentState && $scope.panel) {
      var data = _.cloneDeep($scope.currentState);
      $scope.current = moment.utc(data['@timestamp']).format('YYYY-MM-DD HH:mm:ss.SSS');
      // Create the transformer. The transformer returned is based on the 
      // $scope.panel.view
      var transformer = transform($scope.panel.view, $scope);

      // Create a filter using the filter entered by the user
      var filter = filterByName($scope.panel.filter);

      // Transform and fitler the data
      data = transformer(data);
      $scope.showing = data.filter(filter);

      // To properly display the 1 of 1 for nodes we need to count only 
      // the nodes that are not unassigned. For indexes ever thing should 
      // work just fine
      $scope.viewCount = $scope.showing.reduce(countChildren, 0);
      $scope.totalCount = data.reduce(countChildren, 0);

      // For the Indices view we need to check to see if there are any unassigned
      // shards. If so we need to use a special set of labels for the extra column.
      var view = $scope.panel.view;
      $scope.hasUnassigned = data.some(hasUnassigned);
      if ($scope.hasUnassigned) {
        view += 'WithUnassigned';
      }
      $scope.panel.labels = labels[view];
    }
  };

});
