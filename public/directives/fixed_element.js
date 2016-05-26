var _ = require('lodash');
var $ = require('jquery');

var app = require('ui/modules').get('apps/timelion', []);
app.directive('scrollClass', function ($compile, $rootScope, $window) {
  return {
    restrict: 'A',
    link: function ($scope, $elem, attrs) {
      var num = attrs.scrollLimit; // Height of Kibana Chrome
      $(window).bind('scroll', function () {
        if ($(window).scrollTop() > num) {
          $elem.addClass(attrs.scrollClass);
        } else {
          $elem.removeClass(attrs.scrollClass);
        }
      });
    }
  };
});