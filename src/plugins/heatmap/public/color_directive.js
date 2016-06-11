import _ from 'lodash';
import d3 from 'd3';
import colorbrewer from 'plugins/heatmap/vis/components/colorbrewer/colorbrewer';
import gElement from 'plugins/heatmap/vis/components/elements/g';
import rectElement from 'plugins/heatmap/vis/components/elements/rect';
import uiModules from 'ui/modules';
import colorTemplate from 'plugins/heatmap/colors.html';

const module = uiModules.get('kibana/heatmap', ['kibana']);

module.directive('colorMap', function () {
  function link(scope, element, attrs) {
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
        .fill(function (d) { return d; });

      function draw(selection) {
        selection.each(function (data, index) {
          d3.select(this)
            .datum(data)
            .call(g)
            .select('g')
            .call(rect);
        });
      }

      d3.select(element[0])
        .select('svg.colors')
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
    template: colorTemplate,
    link: link
  };
});
