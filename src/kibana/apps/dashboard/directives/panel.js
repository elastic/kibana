define(function (require) {
  var app = require('modules').get('app/dashboard');

  app.directive('dashboardPanel', function () {
    return {
      restrict: 'E',
      scope: {
        params: '@'
      },
      compile: function (elem, attrs) {
        var params = JSON.parse(attrs.params);
        elem.html(params.type + '<i class="link pull-right fa fa-times remove" />');
      }
    };
  });
});