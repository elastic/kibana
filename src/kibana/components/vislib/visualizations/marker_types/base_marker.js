define(function (require) {
  return function MarkerFactory(d3) {
    var _ = require('lodash');
    var $ = require('jquery');
    var L = require('leaflet');

    function BaseMarker(map, geoJson, params) {
      this.map = map;
      this.geoJson = geoJson;
      this.popups = [];

      this._tooltipFormatter = params.tooltipFormatter || _.identity;
      this._valueFormatter = params.valueFormatter || _.identity;

      // set up the default legend colors
      this.quantizeLegendColors();
    }

    /**
     * Adds legend div to each map when data is split
     * uses d3 scale from BaseMarker.prototype.quantizeLegendColors
     *
     * @method addLegend
     * @return {undefined}
     */
    BaseMarker.prototype.addLegend = function () {
      // ensure we only ever create 1 legend
      if (this._legend) return;

      var self = this;

      // create the legend control, keep a reference
      self._legend = L.control({position: 'bottomright'});

      self._legend.onAdd = function () {
        // creates all the neccessary DOM elements for the control, adds listeners
        // on relevant map events, and returns the element containing the control
        var $div = $('<div>').addClass('tilemap-legend');

        _.each(self._legendColors, function (color, i) {
          var label = $('<div>').text(self._legendQuantizer
          .invertExtent(color)
          .map(self._valueFormatter)
          .join(' – '));

          var icon = $('<i>').css({
            background: color,
            'border-color': self.darkerColor(color)
          });

          label.append(icon);
          $div.append(label);
        });

        return $div.get(0);
      };

      self._legend.addTo(self.map);
    };

    /**
     * Apply style with shading to feature
     *
     * @method applyShadingStyle
     * @param feature {Object}
     * @param min {Number}
     * @param max {Number}
     * @return {Object}
     */
    BaseMarker.prototype.applyShadingStyle = function (value, min, max) {
      this.quantizeLegendColors(min, max);
      var color = this._legendQuantizer(value);

      return {
        fillColor: color,
        color: this.darkerColor(color),
        weight: 1.5,
        opacity: 1,
        fillOpacity: 0.75
      };
    };

    /**
     * Binds popup and events to each feature on map
     *
     * @method bindPopup
     * @param feature {Object}
     * @param layer {Object}
     * return {undefined}
     */
    BaseMarker.prototype.bindPopup = function (feature, layer) {
      var self = this;

      var popup = layer.on({
        mouseover: function (e) {
          var layer = e.target;
          // bring layer to front if not older browser
          if (!L.Browser.ie && !L.Browser.opera) {
            layer.bringToFront();
          }
          var latlng = L.latLng(feature.geometry.coordinates[0], feature.geometry.coordinates[1]);
          self._showTooltip(feature, latlng);
        },
        mouseout: function (e) {
          self._hidePopup();
        }
      });

      self.popups.push(popup);
    };

    /**
     * d3 method returns a darker hex color,
     * used for marker stroke color
     *
     * @method darkerColor
     * @param color {String} hex color
     * @param amount? {Number} amount to darken by
     * @return {String} hex color
     */
    BaseMarker.prototype.darkerColor = function (color, amount) {
      amount = amount || 1.3;
      return d3.hcl(color).darker(amount).toString();
    };

    BaseMarker.prototype.destroy = function (map) {
      var self = this;

      // remove popups
      self.popups = self.popups.filter(function (popup) {
        popup.off('mouseover').off('mouseout');
      });

      if (self._legend) {
        self.map.removeControl(self._legend);
        self._legend = undefined;
      }

      // remove marker layer from map
      if (self._markerGroup) {
        self.map.removeLayer(self._markerGroup);
        self._markerGroup = undefined;
      }
    };

    /**
     * return whether feature is within map bounds
     *
     * @method _filterToMapBounds
     * @param map {Leaflet Object}
     * @return {boolean}
     */
    BaseMarker.prototype._filterToMapBounds = function () {
      var self = this;
      return function (feature) {
        var mapBounds = self.map.getBounds();
        var bucketRectBounds = feature.properties.rectangle.map(function (rect) {
          // turn around the LngLat recieved from ES into LatLng for leaflet
          return rect.slice(0).reverse();
        });

        return mapBounds.intersects(bucketRectBounds);
      };
    };

    BaseMarker.prototype.addToMap = function () {
      this.map.addLayer(this._markerGroup);
    };

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
    BaseMarker.prototype.radiusScale = function (value, max, zoom, precision) {
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

    /**
     * Checks if event latlng is within bounds of mapData
     * features and shows tooltip for that feature
     *
     * @method _showTooltip
     * @param feature {LeafletFeature}
     * @return undefined
     */
    BaseMarker.prototype._showTooltip = function (feature) {
      if (!this.map) return;

      var content = this._tooltipFormatter(feature);
      if (!content) return;

      var lat = feature.geometry.coordinates[1];
      var lng = feature.geometry.coordinates[0];
      var latLng = L.latLng(lat, lng);

      L.popup({autoPan: false})
       .setLatLng(latLng)
       .setContent(content)
       .openOn(this.map);
    };


    /**
     * Closes the tooltip on the map
     *
     * @method _hidePopup
     * @return undefined
     */
    BaseMarker.prototype._hidePopup = function () {
      if (!this.map) return;

      this.map.closePopup();
    };

    /**
     * d3 quantize scale returns a hex color, used for marker fill color
     *
     * @method quantizeLegendColors
     * @param min {Number}
     * @param max {Number}
     * return {undefined}
     */
    BaseMarker.prototype.quantizeLegendColors = function (min, max) {
      min = min || 0;
      max = max || 1;

      var reds1 = ['#ff6128'];
      var reds3 = ['#fecc5c', '#fd8d3c', '#e31a1c'];
      var reds5 = ['#fed976', '#feb24c', '#fd8d3c', '#f03b20', '#bd0026'];
      var bottomCutoff = 2;
      var middleCutoff = 24;

      if (max - min <= bottomCutoff) {
        this._legendColors = reds1;
      } else if (max - min <= middleCutoff) {
        this._legendColors = reds3;
      } else {
        this._legendColors = reds5;
      }

      this._legendQuantizer = d3.scale.quantize().domain([min, max]).range(this._legendColors);
    };

    return BaseMarker;
  };
});
