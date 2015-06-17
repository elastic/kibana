define(function (require) {
  /**
   * Map overlay: canvas layer with leaflet.heat plugin
   *
   * @param map {Leaflet Object}
   * @param mapData {geoJson Object}
   * @return featureLayer {Leaflet object}
   */
  return function (map) {
    var self = this;
    var mapData = this.geoJson;
    var points = this.dataToHeatArray(mapData.properties.allmax);

    var options = {
      radius: +this._attr.heatRadius,
      blur: +this._attr.heatBlur,
      maxZoom: +this._attr.heatMaxZoom,
      minOpacity: +this._attr.heatMinOpacity
    };

    var featureLayer = L.heatLayer(points, options);

    if (self._attr.addTooltip && self.tooltipFormatter && !self._attr.disableTooltips) {
      map.on('mousemove', _.debounce(mouseMoveLocation, 15, {
        'leading': true,
        'trailing': false
      }));
      map.on('mouseout', function (e) {
        map.closePopup();
      });
      map.on('mousedown', function () {
        self._attr.disableTooltips = true;
        map.closePopup();
      });
      map.on('mouseup', function () {
        self._attr.disableTooltips = false;
      });
    }

    function mouseMoveLocation(e) {
      map.closePopup();

      // unhighlight all svgs
      d3.selectAll('path.geohash', this.chartEl).classed('geohash-hover', false);

      if (!mapData.features.length || self._attr.disableTooltips) {
        return;
      }

      var latlng = e.latlng;

      // find nearest feature to event latlng
      var feature = self.nearestFeature(latlng);

      var zoom = map.getZoom();

      // show tooltip if close enough to event latlng
      if (self.tooltipProximity(latlng, zoom, feature, map)) {
        self.showTooltip(map, feature, latlng);
      }
    }

    return featureLayer;
  };
});
