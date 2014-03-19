define(function (require) {
  var app = require('modules').get('app/discover');
  var html = require('text!./partials/field_chooser.html');

  app.directive('discFieldChooser', function () {
    return {
      restrict: 'E',
      scope: {
        fields: '=',
        toggle: '=',
        refresh: '='
      },
      template: html,
      controller: function ($scope) {
        $scope.typeIcon = function (fieldType) {
          switch (fieldType)
          {
          case 'source':
            return 'fa-file-text-o';
          case 'string':
            return 'fa-sort-alpha-asc';
          case 'number':
            return 'fa-sort-numeric-asc';
          case 'date':
            return 'fa-clock-o';
          case 'ip':
            return 'fa-laptop';
          default:
          }
        };
      }
    };
  });
});