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
     * @param params {Object}
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
          var value = _.get(feature, 'properties.value');
          return self.applyShadingStyle(value, min, max);
        },
        filter: self._filterToMapBounds()
      });

      this.addToMap();
    }

    /**
     * radiusScale returns a number for scaled circle markers
     * square root of value / max
     * multiplied by a value based on map zoom
     * multiplied by a value based on data precision
     * for relative sizing of markers
     *
     * @method radiusScale
     * @param value {Number}
     * @param max {Number}
     * @param zoom {Number}
     * @param precision {Number}
     * @return {Number}
     */
    ScaledCircleMarker.prototype.radiusScale = function (value, max, zoom, precision) {
      // exp = 0.5 for square root ratio
      // exp = 1 for linear ratio
      var exp = 0.5;
      var precisionBiasNumerator = 200;
      var precisionBiasBase = 5;
      var pct = Math.abs(value) / Math.abs(max);
      var constantZoomRadius = 0.5 * Math.pow(2, zoom);
      var precisionScale = precisionBiasNumerator / Math.pow(precisionBiasBase, precision);

      return Math.pow(pct, exp) * constantZoomRadius * precisionScale;
    };


    return ScaledCircleMarker;
  };
});
