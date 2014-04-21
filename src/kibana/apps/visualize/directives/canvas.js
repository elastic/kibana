define(function (require) {
  var module = require('modules').get('app/visualize');
  var $ = require('jquery');
  var _ = require('lodash');

  module.directive('visCanvas', function ($http) {
    return {
      restrict: 'A',
      link: function ($scope, $el) {
        var $window = $(window);
        var $body = $(document.body);

        var vals = {
          windowHeight: function () {
            return $window.height();
          },
          offsetTop: function () {
            return $el.offset().top;
          }
        };

        var cur = {};

        var needRender = function () {
          var need = false;
          _.forOwn(vals, function (get, name) {
            var val = get();
            if (cur[name] !== val) {
              need = true;
              cur[name] = val;
            }
          });
          return need;
        };

        var render = function () {
          var parentPadding = _.reduce($el.parents().toArray(), function (padding, parent) {
            var $parent = $(parent);
            return padding + (parseInt($parent.css('paddingBottom'), 10) || 0) - (parseInt($parent.css('marginBottom'), 10) || 0);
          }, 0);

          $el.css('height', cur.windowHeight - cur.offsetTop - parentPadding);
        };

        var poll = function () {
          if (poll.id) clearTimeout(poll.id);
          poll.count = 0;

          (function check() {
            var need = needRender();
            if (need) {
              poll.count = 0;
              render();
            } else {
              poll.count ++;
            }

            if (poll.count < 5) poll.id = setTimeout(check, 100);
          }());
        };

        $window.on('resize', poll);
        $body.on('mousedown mouseup', poll);

        $scope.pendingHttpRequests = $http.pendingRequests;
        $scope.$watch('pendingHttpRequests.length', poll);

        $scope.$on('$destroy', function () {
          $window.off('resize', poll);
          $body.off('mousedown mouseup', poll);
          clearTimeout(poll.id);
        });
      }
    };
  });
});