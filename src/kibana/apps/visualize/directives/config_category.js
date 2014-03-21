define(function (require) {
  var html = require('text!../partials/config_category.html');

  require('./config_editor');

  require('modules')
    .get('app/visualize')
    .directive('visConfigCategory', function () {
      return {
        restrict: 'E',
        scope: {
          categoryName: '=',
          vis: '=',
          fields: '='
        },
        template: html,
        link: function ($scope, $el) {
          $scope.category = $scope.vis[$scope.categoryName];
        }
      };
    });
});