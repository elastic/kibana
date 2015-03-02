define(function (require) {
  return function PointSeriesTooltipFormatter($compile, $rootScope) {
    var _ = require('lodash');
    var $ = require('jquery');

    var $tooltipScope = $rootScope.$new();
    var $tooltip = $(require('text!components/agg_response/point_series/_tooltip.html'));
    $compile($tooltip)($tooltipScope);

    return function tooltipFormatter(event) {
      var datum = event.datum;
      if (!datum || !datum.aggConfigResult) return '';

      var details = $tooltipScope.details = [];
      var result = { $parent: datum.aggConfigResult };

      function addDetail(result) {
        var agg = result.aggConfig;
        var value = result.value;
        if (agg === datum.aggConfigResult.aggConfig && datum.yScale != null) value *= datum.yScale;

        details.push({
          value: agg.fieldFormatter()(value),
          label: agg.makeLabel()
        });
      }

      datum.extraMetrics.forEach(addDetail);
      while ((result = result.$parent) && result.aggConfig) {
        addDetail(result);
      }


      $tooltipScope.$apply();
      return $tooltip[0].outerHTML;
    };
  };
});
