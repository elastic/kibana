define(function (require) {
  var angular = require('angular');
  require('angular-animate');
  require('angular-ui-router');

  return function () {
    var name = 'commonModule';

    angular.module(name, [
      'ui.router',
      'ngAnimate'
    ])
    return name;
  };
});
