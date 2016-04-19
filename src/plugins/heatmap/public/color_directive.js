var _ = require('lodash');
var colorbrewer = require('plugins/heatmap/vis/components/colorbrewer/colorbrewer');
var gElement = require('plugins/heatmap/vis/components/elements/g');
var rectElement = require('plugins/heatmap/vis/components/elements/rect');

var module = require('ui/modules').get('heatmap');

module.directive('colorMap', function () {
  function link (scope, element, attrs) {
    scope.colorScale = colorbrewer[scope.name];
    scope.colors = scope.colorScale[scope.value];
    scope.min = _.first(Object.keys(scope.colorScale));
    scope.max = _.last(Object.keys(scope.colorScale));

    function render(colors) {
      var size = 15;
      var padding = 2;
      var g = gElement();
      var rect = rectElement()
        .x(function (d, i) { return i * size + padding; })
        .y(0)
        .width(size)
        .height(size)
        .fill(function (d) { return d; })

      function draw(selection) {
        selection.each(function (data, index) {
          d3.select(this)
            .datum(data)
            .call(g)
            .select('g')
            .call(rect);
        });
      }

      d3.select(element[0]).select('svg.colors')
        .datum(colors)
        .call(draw);
    }

    scope.$watch('name', function (newVal, oldVal) {
      scope.colorScale = colorbrewer[newVal];
      scope.colors = scope.colorScale[scope.value];
      scope.min = _.first(Object.keys(scope.colorScale));
      scope.max = _.last(Object.keys(scope.colorScale));
      render(scope.colors);
    });

    scope.$watch('value', function (newVal, oldVal) {
      scope.value = newVal;
      scope.colors = scope.colorScale[newVal];
      render(scope.colors);
    });
  }

  return {
    restrict: 'E',
    scope: {
      name: '=',
      value: '='
    },
    template: require('plugins/heatmap/colors.html'),
    link: link
  };
});
