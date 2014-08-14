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
  var _ = require('lodash');  
  var getValue = require('./getValueFromArrayOrString');
  return function ($scope) {
    var colors = [];
    var previous = {};
    var runningTotal = 0;
    var grandTotal = $scope.timelineData.length;
    _.each($scope.timelineData, function (row) {
      var status = getValue(row.fields.status) || 'green';
      var last = _.last(colors);
      if (!last) {
        last = { status: status , count: 0 };
        colors.push(last);
      } 
      if (last.status === status) {
        last.count++;
      } else {
        colors.push({ status: status, count: 1 });
      }
    });
    colors = _.map(colors, function (val) {
      runningTotal += previous.width || 0;
      val.left = runningTotal;
      val.width = (val.count/grandTotal)*100;
      previous = val;
      return val;
    });
    $scope.colors = colors;
  };
});
