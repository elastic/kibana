let _ = require('lodash');
let $ = require('jquery');

let app = require('ui/modules').get('apps/timelion', []);
app.directive('fixedElementRoot', function ($timeout) {
  return {
    restrict: 'A',
    link: function ($scope, $elem, attrs) {
      let fixedAt;
      $(window).bind('scroll', function () {
        let fixed = $('[fixed-element]', $elem);
        let body = $('[fixed-element-body]', $elem);
        let top = fixed.offset().top;

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
