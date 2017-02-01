import $ from 'jquery';
export default function PointSeriesTooltipFormatter($compile, $rootScope) {

  const $tooltipScope = $rootScope.$new();
  const $tooltip = $(require('ui/agg_response/point_series/_tooltip.html'));
  $compile($tooltip)($tooltipScope);

  return function tooltipFormatter(event) {
    const datum = event.datum;
    if (!datum || !datum.aggConfigResult) return '';

    const details = $tooltipScope.details = [];
    let result = { $parent: datum.aggConfigResult };

    function addDetail(result) {
      const agg = result.aggConfig;
      const value = result.value;

      const detail = {
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
}
