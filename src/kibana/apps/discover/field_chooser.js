define(function (require) {
  var app = require('modules').get('app/discover');
  var html = require('text!./field_chooser.html');

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
          console.log(fieldType);
          switch (fieldType)
          {
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