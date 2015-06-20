define(function (require) {
  return function ShadedCircleMarkerFactory(Private) {
    var _ = require('lodash');
    var L = require('leaflet');

    var BaseMarker = Private(require('components/vislib/visualizations/marker_types/base_marker'));

    /**
     * Map overlay: circle markers that are shaded to illustrate values
     *
     * @param map {Leaflet Object}
     * @param mapData {geoJson Object}
     * @return {Leaflet object} featureLayer
     */
    _.class(ShadedCircleMarker).inherits(BaseMarker);
    function ShadedCircleMarker(map, geoJson, params) {
      var self = this;
      ShadedCircleMarker.Super.apply(this, arguments);

      // super min and max from all chart data
      var min = this.geoJson.properties.allmin;
      var max = this.geoJson.properties.allmax;

      // multiplier to reduce size of all circles
      var scaleFactor = 0.8;

      this._createMarkerGroup({
        pointToLayer: function (feature, latlng) {
          var radius = self._geohashMinDistance(feature) * scaleFactor;
          return L.circle(latlng, radius);
        }
      });

    }

    /**
     * _geohashMinDistance returns a min distance in meters for sizing
     * circle markers to fit within geohash grid rectangle
     *
     * @method _geohashMinDistance
     * @param feature {Object}
     * @return {Number}
     */
    ShadedCircleMarker.prototype._geohashMinDistance = function (feature) {
      var centerPoint = feature.properties.center;
      var geohashRect = feature.properties.rectangle;

      // get lat[1] and lng[0] of geohash center point
      // apply lat to east[2] and lng to north[3] sides of rectangle
      // to get radius at center of geohash grid recttangle
      var center = L.latLng([centerPoint[1], centerPoint[0]]);
      var east   = L.latLng([centerPoint[1], geohashRect[2][0]]);
      var north  = L.latLng([geohashRect[3][1], centerPoint[0]]);

      var eastRadius  = Math.floor(center.distanceTo(east));
      var northRadius = Math.floor(center.distanceTo(north));

      return _.min([eastRadius, northRadius]);
    };

    return ShadedCircleMarker;
  };
});
