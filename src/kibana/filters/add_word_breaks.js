define(function (require) {
  var angular = require('angular');
  var module = require('modules').get('kibana');
  var addWordBreaks = require('utils/add_word_breaks');

  // Simple filter to insert word breaks
  module.filter('addWordBreaks', function () {
    return addWordBreaks;
  });
});