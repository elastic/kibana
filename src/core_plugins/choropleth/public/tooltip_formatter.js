import $ from 'jquery';
export default function TileMapTooltipFormatter($compile, $rootScope) {

  const $tooltipScope = $rootScope.$new();
  const $el = $('<div>').html(require('./tooltip.html'));
  $compile($el)($tooltipScope);

  return function tooltipFormatter(metricAgg, metric, fieldName) {

    if (!metric) {
      return '';
    }

    $tooltipScope.details = [];
    if (fieldName && metric) {
      $tooltipScope.details.push({
        label: fieldName,
        value: metric.term
      });
    }

    if (metric) {
      $tooltipScope.details.push({
        label: metricAgg.makeLabel(),
        value: metricAgg.fieldFormatter()(metric.value)
      });
    }

    $tooltipScope.$apply();
    return $el.html();
  };
}
