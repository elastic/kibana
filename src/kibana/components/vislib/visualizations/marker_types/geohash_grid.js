define(function (require) {
  /**
   * Map overlay: rectangles that show the geohash grid bounds
   *
   * @param map {Leaflet Object}
   * @param mapData {geoJson Object}
   * @return {undefined}
   */
  return function (map) {
    var self = this;
    var mapData = self.geoJson;

    // super min and max from all chart data
    var min = mapData.properties.allmin;
    var max = mapData.properties.allmax;

    var bounds;

    var featureLayer = L.geoJson(mapData, {
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
        return self.applyShadingStyle(feature, min, max);
      },
      filter: self._filterToMapBounds(map)
    });

    self.addLegend(map);

    return featureLayer;
  };
});
