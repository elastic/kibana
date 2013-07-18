/*jshint globalstrict:true */
/*global angular:true */
'use strict';

angular.module('kibana.filters', [])
.filter('stringSort', function() {
    return function(input) {
      return input.sort();
    };
  });