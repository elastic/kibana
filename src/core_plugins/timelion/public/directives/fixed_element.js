var _ = require('lodash');
var $ = require('jquery');

var app = require('ui/modules').get('apps/timelion', []);
app.directive('fixedElementRoot', function ($timeout) {
  return {
    restrict: 'A',
    link: function ($scope, $elem, attrs) {
      var fixedAt;
      $(window).bind('scroll', function () {
        var fixed = $('[fixed-element]', $elem);
        var body = $('[fixed-element-body]', $elem);
        var top = fixed.offset().top;

        if ($(window).scrollTop() > top) {
          // This is a gross hack, but its better than it was. I guess
          fixedAt = $(window).scrollTop();
          fixed.addClass(fixed.attr('fixed-element'));
          body.addClass(fixed.attr('fixed-element-body'));
          body.css({top: fixed.height()});
        }

        if ($(window).scrollTop() < fixedAt) {
          fixed.removeClass(fixed.attr('fixed-element'));
          body.removeClass(fixed.attr('fixed-element-body'));
          body.removeAttr('style');
        }
      });
    }
  };
});
