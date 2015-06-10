define(function (require) {
  return function PointSeriesTooltipFormatter($compile, $rootScope) {
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

        var detail = {
          value: agg.fieldFormatter()(value),
          label: agg.makeLabel()
        };

        if (agg === datum.aggConfigResult.aggConfig) {
          detail.percent = event.percent;
          if (datum.yScale != null) {
            detail.value = agg.fieldFormatter()(value * datum.yScale);
          }
        }

        details.push(detail);
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
