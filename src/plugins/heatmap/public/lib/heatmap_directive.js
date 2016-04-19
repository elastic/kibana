var d3 = require('d3');
var _ = require('lodash');
var visGenerator = require('plugins/heatmap/vis/index');

var module = require('ui/modules').get('heatmap');

module.directive('heatmap', function () {
  function link (scope, element, attrs) {
    angular.element(document).ready(function () {
      var vis = visGenerator();
      var svg = d3.select(element[0]);

      function onSizeChange() {
        return {
          width: element.parent().width(),
          height: element.parent().height()
        };
      }

      function getSize() {
        var size = onSizeChange();
        return [size.width, size.height];
      };

      function render(data, opts, eventListeners) {
        var chartSize;

        opts = opts || {};
        eventListeners = eventListeners || {};
        chartSize = getSize();

        vis.options(opts)
          .listeners(eventListeners)
          .size(chartSize);

        if (data) {
          svg.datum(data).call(vis);
        }
      };

      scope.$watch('data', function (newVal, oldVal) {
        render(newVal, scope.options, scope.eventListeners);
      });

      scope.$watch('options', function (newVal, oldVal) {
        render(scope.data, newVal, scope.eventListeners);
      });

      scope.$watch('eventListeners', function (newVal, oldVal) {
        render(scope.data, scope.options, newVal);
      });

      scope.$watch(onSizeChange, _.debounce(function () {
        render(scope.data, scope.options, scope.eventListeners);
      }, 250), true);

      element.bind('resize', function () {
        scope.$apply();
      });
    });
  }

  return {
    restrict: 'E',
    scope: {
      data: '=',
      options: '=',
      eventListeners: '='
    },
    template: '<svg class="parent"></svg>',
    replace: 'true',
    link: link
  };
});
