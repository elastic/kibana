define(function (require) {
  /**
   * Map overlay: circle markers that are shaded to illustrate values
   *
   * @param map {Leaflet Object}
   * @param mapData {geoJson Object}
   * @return {Leaflet object} featureLayer
   */
  return function (map) {
    var self = this;
    var mapData = self.geoJson;
    // super min and max from all chart data
    var min = mapData.properties.allmin;
    var max = mapData.properties.allmax;

    // multiplier to reduce size of all circles
    var scaleFactor = 0.8;

    var featureLayer = L.geoJson(mapData, {
      pointToLayer: function (feature, latlng) {
        var radius = self.geohashMinDistance(feature) * scaleFactor;
        return L.circle(latlng, radius);
      },
      onEachFeature: function (feature, layer) {
        self.bindPopup(feature, layer, map);
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
