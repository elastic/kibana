/**
 * ELASTICSEARCH CONFIDENTIAL
 * _____________________________
 *
 *  [2014] Elasticsearch Incorporated All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Elasticsearch Incorporated and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Elasticsearch Incorporated
 * and its suppliers and may be covered by U.S. and Foreign Patents,
 * patents in process, and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Elasticsearch Incorporated.
 */



define(function (require) {
  'use strict';
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
      $scope.current = data['@timestamp'];
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
