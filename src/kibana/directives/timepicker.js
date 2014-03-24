define(function (require) {
  var html = require('text!partials/timepicker.html');
  var module = require('modules').get('kibana/directives');

  module.directive('kbnTimepicker', function () {
    return {
      restrict: 'E',
      scope: {
        from: '=',
        to: '='
      },
      template: html
    };
  });

});