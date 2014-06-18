define(function (require) {
  var module = require('modules').get('apps/visualize');
  module.directive('visSearchEditor', function () {
    return {
      restrict: 'E',
      scope: {
        vis: '='
      },
      template: require('text!apps/visualize/partials/search_editor.html'),
      link: function ($scope, $el) {

      }
    };
  });
});