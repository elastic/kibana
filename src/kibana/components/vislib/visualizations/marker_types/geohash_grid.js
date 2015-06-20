define(function (require) {
  return function GeohashGridMarkerFactory(Private) {
    var _ = require('lodash');
    var L = require('leaflet');

    var BaseMarker = Private(require('components/vislib/visualizations/marker_types/base_marker'));

    /**
     * Map overlay: rectangles that show the geohash grid bounds
     *
     * @param map {Leaflet Object}
     * @param mapData {geoJson Object}
     * @return {undefined}
     */
    _.class(GeohashGridMarker).inherits(BaseMarker);
    function GeohashGridMarker(map, geoJson, params) {
      var self = this;
      GeohashGridMarker.Super.apply(this, arguments);

      // super min and max from all chart data
      var min = this.geoJson.properties.allmin;
      var max = this.geoJson.properties.allmax;

      this._markerGroup = L.geoJson(this.geoJson, {
        pointToLayer: function (feature, latlng) {
          var geohashRect = feature.properties.rectangle;
          // get bounds from northEast[3] and southWest[1]
          // corners in geohash rectangle
          var corners = [
            [geohashRect[3][1], geohashRect[3][0]],
            [geohashRect[1][1], geohashRect[1][0]]
          ];
          return L.rectangle(corners);
        },
        onEachFeature: function (feature, layer) {
          self.bindPopup(feature, layer, map);
          layer.on({
            mouseover: function (e) {
              var layer = e.target;
              // bring layer to front if not older browser
              if (!L.Browser.ie && !L.Browser.opera) {
                layer.bringToFront();
              }
            }
          });
        },
        style: function (feature) {
          var value = _.get(feature, 'properties.value');
          return self.applyShadingStyle(value, min, max);
        },
        filter: self._filterToMapBounds(map)
      });

      this.addToMap();
    }

    return GeohashGridMarker;
  };
});
