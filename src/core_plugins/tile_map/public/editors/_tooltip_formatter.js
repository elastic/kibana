import $ from 'jquery';

export function TileMapTooltipFormatterProvider($compile, $rootScope) {

  const $tooltipScope = $rootScope.$new();
  const $el = $('<div>').html(require('./_tooltip.html'));
  $compile($el)($tooltipScope);

  return function tooltipFormatter(aggConfig, metricAgg, feature) {

    if (!feature) {
      return '';
    }

    $tooltipScope.details = [
      {
        label: metricAgg.makeLabel(),
        value: metricAgg.fieldFormatter()(feature.properties.value)
      },
      {
        label: 'Latitude',
        value: feature.geometry.coordinates[1]
      },
      {
        label: 'Longitude',
        value: feature.geometry.coordinates[0]
      }
    ];

    $tooltipScope.$apply();

    return $el.html();
  };
}
