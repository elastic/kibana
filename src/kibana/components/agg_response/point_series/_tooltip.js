define(function (require) {
  return function PointSeriesTooltip($compile, $rootScope) {
    var _ = require('lodash');
    var $ = require('jquery');

    var $tooltipScope = $rootScope.$new();
    var $tooltip = $(require('text!plugins/vis_types/tooltips/histogram.html'));
    $compile($tooltip)($tooltipScope);

    function tooltip(table, chart, col, index) {
      // setup the formatter for the label
      chart.tooltipFormatter = function (event) {
        var datum = event.point;
        var point = datum.orig;

        var details = $tooltipScope.details = [];
        var result = { $parent: point.aggConfigResult };
        while ((result = result.$parent) && result.aggConfig) {
          var agg = result.aggConfig;

          details.push({
            value: agg.fieldFormatter()(result.value),
            label: agg.makeLabel()
          });
        }

        $tooltipScope.$apply();
        return $tooltip[0].outerHTML;
      };
    }

    return tooltip;
  };
});