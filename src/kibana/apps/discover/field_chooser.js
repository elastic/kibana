define(function (require) {
  var app = require('angular').module('app/discover');
  var html = require('text!./field_chooser.html');

  app.directive('discFieldChooser', function () {
    return {
      restrict: 'E',
      scope: {
        fields: '=',
        toggle: '=',
        refresh: '='
      },
      template: html
    };
  });
});