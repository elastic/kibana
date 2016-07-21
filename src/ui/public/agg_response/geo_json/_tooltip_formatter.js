define(function (require) {
  return function TileMapTooltipFormatter($compile, $rootScope, Private) {
    var $ = require('jquery');
    var _ = require('lodash');

    var fieldFormats = Private(require('ui/registry/field_formats'));
    var $tooltipScope = $rootScope.$new();
    var $el = $('<div>').html(require('ui/agg_response/geo_json/_tooltip.html'));
    $compile($el)($tooltipScope);

    return function tooltipFormatter(feature) {
      if (!feature) return '';

      var value = feature.properties.value;
      var acr = feature.properties.aggConfigResult;
      var vis = acr.aggConfig.vis;

      var metricAgg = acr.aggConfig;
      var geoFormat = _.get(vis.aggs, 'byTypeName.geohash_grid[0].format');
      if (!geoFormat) geoFormat = fieldFormats.getDefaultInstance('geo_point');

      $tooltipScope.details = [
        {
          label: metricAgg.makeLabel(),
          value: metricAgg.fieldFormatter()(value)
        },
        {
          label: 'Center',
          value: geoFormat.convert({
            lat: feature.geometry.coordinates[1],
            lon: feature.geometry.coordinates[0]
          })
        }
      ];

      $tooltipScope.$apply();

      return $el.html();
    };
  };
});
