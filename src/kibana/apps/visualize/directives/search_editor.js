define(function (require) {
  var module = require('modules').get('app/visualize');
  module.directive('visSearchEditor', function () {
    return {
      restrict: 'E',
      scope: {
        vis: '='
      },
      template: require('text!../partials/search_editor.html'),
      link: function ($scope, $el) {

      }
    };
  });
});