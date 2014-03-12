define(function (require) {
  var notify = require('modules').get('notify');
  var _ = require('lodash');
  var $ = require('jquery');
  var MutableWatcher = require('utils/mutable_watcher');
  var nextTick = require('utils/next_tick');

  var defaultToastOpts = {
    title: 'Notice',
    lifetime: 7000
  };

  var transformKey = (function () {
    var el = document.createElement('div');
    return _.find(['transform', 'webkitTransform', 'OTransform', 'MozTransform', 'msTransform'], function (key) {
      return el.style[key] !== void 0;
    });
  }());

  notify.directive('kbnNotifications', function () {
    return {
      restrict: 'A',
      scope: {
        list: '=list'
      },
      template: require('text!./partials/toaster.html'),
      link: function ($scope, $el) {

        $el.addClass('toaster-container');

        // handles recalculating positions and offsets, schedules
        // recalcs and waits for 100 seconds before running again.
        var layoutList = (function () {
          // lazy load the $nav element
          var navSelector = '.content > nav.navbar:first()';
          var $nav;

          // pixels between the top of list and it's attachment(nav/window)
          var spacing = 10;
          // was the element set to postition: fixed last calc?

          var visible = false;

          var recalc = function () {
            // set $nav lazily
            if (!$nav || !$nav.length) $nav = $(navSelector);

            // if we can't find the nav, don't display the list
            if (!$nav.length) return;

            // the top point at which the list should be secured
            var fixedTop = $nav.height();

            // height of the section at the top of the page that is hidden
            var hiddenBottom = document.body.scrollTop;

            var top, left, css = {
              visibility: 'visible'
            };

            if (hiddenBottom > fixedTop) {
              // if we are already fixed, no reason to set the styles again
              css.position = 'fixed';
              top = spacing;
            } else {
              css.position = 'absolute';
              top = fixedTop + spacing;
            }

            // calculate the expected left value (keep it centered)
            left = Math.floor((document.body.scrollWidth - $el.width()) / 2);
            css[transformKey] = 'translateX(' + Math.round(left) + 'px) translateY(' + Math.round(top) + 'px)';
            if (transformKey !== 'msTransform') {
              // The Z transform will keep this in the GPU (faster, and prevents artifacts),
              // but IE9 doesn't support 3d transforms and will choke.
              css[transformKey] += ' translateZ(0)';
            }

            $el.css(css);
          };

          // track the already scheduled recalcs
          var timeoutId;
          var clearSchedule = function () {
            timeoutId = null;
          };

          var schedule = function () {
            if (timeoutId) return;
            else recalc();
            timeoutId = setTimeout(clearSchedule, 25);
          };

          // call to remove the $el from the view
          schedule.hide = function () {
            $el.css('visibility', 'hidden');
            visible = false;
          };

          return schedule;
        }());

        function listen(off) {
          $(window)[off ? 'off' : 'on']('resize scroll', layoutList);
        }

        var wat = new MutableWatcher({
          $scope: $scope,
          expression: 'list',
          type: 'collection'
        }, showList);

        function showList(list) {
          if (list && list.length) {
            listen();
            wat.set(hideList);

            // delay so that angular has time to update the DOM
            nextTick(layoutList);
          }
        }

        function hideList(list) {
          if (!list || !list.length) {
            listen(true);
            wat.set(showList);
            layoutList.hide();
          }
        }

        $scope.$on('$destoy', _.partial(listen, true));
      }
    };
  });
});