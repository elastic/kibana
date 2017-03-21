import $ from 'jquery';

const app = require('ui/modules').get('apps/timelion', []);
app.directive('fixedElementRoot', function () {
  return {
    restrict: 'A',
    link: function ($scope, $elem) {
      let fixedAt;
      $(window).bind('scroll', function () {
        const fixed = $('[fixed-element]', $elem);
        const body = $('[fixed-element-body]', $elem);
        const top = fixed.offset().top;

        if ($(window).scrollTop() > top) {
          // This is a gross hack, but its better than it was. I guess
          fixedAt = $(window).scrollTop();
          fixed.addClass(fixed.attr('fixed-element'));
          body.addClass(fixed.attr('fixed-element-body'));
          body.css({ top: fixed.height() });
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
