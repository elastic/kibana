define(function (require) {
  return function TileMapTooltipFormatter($compile, $rootScope, Private) {
    let $ = require('jquery');
    let _ = require('lodash');

    let fieldFormats = Private(require('ui/registry/field_formats'));
    let $tooltipScope = $rootScope.$new();
    let $el = $('<div>').html(require('ui/agg_response/geo_json/_tooltip.html'));
    $compile($el)($tooltipScope);

    return function tooltipFormatter(feature) {
      if (!feature) return '';

      let value = feature.properties.value;
      let acr = feature.properties.aggConfigResult;
      let vis = acr.aggConfig.vis;

      let metricAgg = acr.aggConfig;
      let geoFormat = _.get(vis.aggs, 'byTypeName.geohash_grid[0].format');
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
