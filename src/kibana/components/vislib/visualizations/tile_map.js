define(function (require) {
  return function TileMapFactory(d3, Private) {
    var _ = require('lodash');
    var $ = require('jquery');
    var L = require('leaflet');
    require('leaflet-heat');
    require('leaflet-draw');
    require('css!components/vislib/styles/main');

    var Chart = Private(require('components/vislib/visualizations/_chart'));
    var Map = Private(require('components/vislib/visualizations/_map'));

    // Convenience function to turn around the LngLat recieved from ES
    function cloneAndReverse(arr) {
      var l = arr.length;
      return arr.map(function (curr, idx) { return arr[l - (idx + 1)]; });
    }

    /**
     * Tile Map Visualization: renders maps
     *
     * @class TileMap
     * @constructor
     * @extends Chart
     * @param handler {Object} Reference to the Handler Class Constructor
     * @param chartEl {HTMLElement} HTML element to which the map will be appended
     * @param chartData {Object} Elasticsearch query results for this map
     */
    _.class(TileMap).inherits(Chart);
    function TileMap(handler, chartEl, chartData) {
      if (!(this instanceof TileMap)) {
        return new TileMap(handler, chartEl, chartData);
      }

      TileMap.Super.apply(this, arguments);

      // track the map objects
      this.maps = [];
      this._chartData = chartData || {};
      _.assign(this, this._chartData);

      // add allmin and allmax to geoJson
      var allMinMax = this.getMinMax(handler.data.data);
      this.geoJson.properties.allmin = allMinMax.min;
      this.geoJson.properties.allmax = allMinMax.max;
    }

    /**
     * Renders tile map
     *
     * @method draw
     * @return {Function} - function to add a map to a selection
     */
    TileMap.prototype.draw = function () {
      var self = this;
      var mapData = this.geoJson;

      // clean up old maps
      self.destroy();

      // clear maps array
      self.maps = [];

      return function (selection) {
        selection.each(function () {
          // add leaflet latLngs to properties for tooltip
          self.addLatLng(mapData);

          var container = $(this).addClass('tilemap');

          var map = new Map(container, self._chartData, {
            // center: self._attr.mapCenter,
            // zoom: self._attr.mapZoom,
            events: self.events,
            markerType: self._attr.mapType,
            isDesaturated: self._attr.isDesaturated,
            tooltipFormatter: self.tooltipFormatter,
            valueFormatter: self.valueFormatter,
            addTooltip: self._attr.addTooltip
          });

          // add title for splits
          if (self.title) {
            map.addTitle(self.title);
          }

          // add fit to bounds control
          if (mapData && mapData.features.length > 0) {
            map.addFitControl();
            map.addBoundingControl();
          }

          self.maps.push(map);
        });
      };
    };

    /**
     * get min and max for all cols, rows of data
     *
     * @method getMaxMin
     * @param data {Object}
     * @return {Object}
     */
    TileMap.prototype.getMinMax = function (data) {
      var min = [];
      var max = [];
      var allData;

      if (data.rows) {
        allData = data.rows;
      } else if (data.columns) {
        allData = data.columns;
      } else {
        allData = [data];
      }

      allData.forEach(function (datum) {
        min.push(datum.geoJson.properties.min);
        max.push(datum.geoJson.properties.max);
      });

      var minMax = {
        min: _.min(min),
        max: _.max(max)
      };

      return minMax;
    };

    /**
     * add Leaflet latLng to mapData properties
     *
     * @method addLatLng
     * @return undefined
     */
    TileMap.prototype.addLatLng = function () {
      this.geoJson.features.forEach(function (feature) {
        feature.properties.latLng = L.latLng(
          feature.geometry.coordinates[1],
          feature.geometry.coordinates[0]
        );
      });
    };

    /**
     * Invalidate the size of the map, so that leaflet will resize to fit.
     * then moves to center
     *
     * @method resizeArea
     * @return {undefined}
     */
    TileMap.prototype.resizeArea = function () {
      this.maps.forEach(function (map) {
        map.updateSize();
      });
    };

    /**
     * clean up the maps
     *
     * @method destroy
     * @return {undefined}
     */
    TileMap.prototype.destroy = function () {
      this.maps.forEach(function (map) {
        map.destroy();
      });
    };

    return TileMap;
  };
});
