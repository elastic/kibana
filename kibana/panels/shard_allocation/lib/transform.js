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
  var indicesByNodes = require('../transformers/indicesByNodes');
  var nodesByIndices = require('../transformers/nodesByIndices');

  // This will curry a transform function based on the view.
  return function (view, $scope) {
    var func = (view === 'indices') ? indicesByNodes : nodesByIndices;
    // we need to pass the scope to filter the data in the transformer functions
    // for the auto-complete filter.
    return func($scope);
  };
});
