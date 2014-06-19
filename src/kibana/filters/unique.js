// Filters out all duplicate items in an array
define(function (require) {
  var _ = require('lodash');

  require('modules')
    .get('kibana/filters')
    .filter('unique', function () {
      return function (arr) {
        var list = _.unique(arr);
        return list;
      };
    });
});