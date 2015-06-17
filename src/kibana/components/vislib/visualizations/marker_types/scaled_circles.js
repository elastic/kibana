define(function (require) {
  return function ScaledCircleMarkerFactory(Private) {
    var _ = require('lodash');
    var L = require('leaflet');

    var BaseMarker = Private(require('components/vislib/visualizations/marker_types/base_marker'));

    /**
     * Map overlay: circle markers that are scaled to illustrate values
     *
     * @param map {Leaflet Object}
     * @param mapData {geoJson Object}
     * @return {Leaflet object} featureLayer
     */
    _.class(ScaledCircleMarker).inherits(BaseMarker);
    function ScaledCircleMarker(map, geoJson, params) {
      var self = this;
      ScaledCircleMarker.Super.apply(this, arguments);

      // super min and max from all chart data
      var min = this.geoJson.properties.allmin;
      var max = this.geoJson.properties.allmax;
      var zoom = this.map.getZoom();
      var precision = _.max(this.geoJson.features.map(function (feature) {
        return String(feature.properties.geohash).length;
      }));

      // multiplier to reduce size of all circles
      var scaleFactor = 0.6;
      var radiusScaler = 2.5;

      this._markerGroup = L.geoJson(this.geoJson, {
        pointToLayer: function (feature, latlng) {
          var value = feature.properties.value;
          var scaledRadius = self.radiusScale(value, max, zoom, precision) * scaleFactor;
          return L.circleMarker(latlng).setRadius(scaledRadius);
        },
        onEachFeature: function (feature, layer) {
          self.bindPopup(feature, layer);
        },
        style: function (feature) {
          return self.applyShadingStyle(feature.properties.value, min, max);
        },
        filter: self._filterToMapBounds()
      });

      this.addToMap();
    }

    return ScaledCircleMarker;
  };
});
