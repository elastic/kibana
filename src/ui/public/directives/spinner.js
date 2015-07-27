define(function (require) {
  var html = '<div class="bounce1"></div> <div class="bounce2"></div> <div class="bounce3"></div>';
  var module = require('ui/modules').get('kibana');

  module.directive('spinner', function () {
    return {
      restrict: 'C',
      template: html
    };
  });

});