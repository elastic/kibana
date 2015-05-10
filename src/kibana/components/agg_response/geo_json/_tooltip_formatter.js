define(function (require) {
  return function TileMapTooltipFormatter($compile, $rootScope) {
    var $ = require('jquery');

    var $tooltipScope = $rootScope.$new();
    var $tooltip = $(require('text!components/agg_response/geo_json/_tooltip.html'));
    $compile($tooltip)($tooltipScope);

    return function tooltipFormatter(feature) {
      if (!feature) return '';

      var details = $tooltipScope.details = [];

      var lat = feature.geometry.coordinates[1];
      var lng = feature.geometry.coordinates[0];

      var metric = {
        label: feature.properties.valueLabel,
        value: feature.properties.valueFormatted
      };
      var location = {
        label: 'Geohash center',
        value: lat.toFixed(3) + ', ' + lng.toFixed(3)
      };

      details.push(metric, location);

      $tooltipScope.$apply();

      return $tooltip[0].outerHTML;
    };
  };
});