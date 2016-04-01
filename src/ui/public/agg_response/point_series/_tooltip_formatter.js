define(function (require) {
  return function PointSeriesTooltipFormatter($compile, $rootScope) {
    let $ = require('jquery');

    let $tooltipScope = $rootScope.$new();
    let $tooltip = $(require('ui/agg_response/point_series/_tooltip.html'));
    $compile($tooltip)($tooltipScope);

    return function tooltipFormatter(event) {
      let datum = event.datum;
      if (!datum || !datum.aggConfigResult) return '';

      let details = $tooltipScope.details = [];
      let result = { $parent: datum.aggConfigResult };

      function addDetail(result) {
        let agg = result.aggConfig;
        let value = result.value;

        let detail = {
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
