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
     * Finds nearest feature in mapData to event latlng
     *
     * @method nearestFeature
     * @param point {Leaflet Object}
     * @return nearestPoint {Leaflet Object}
     */
    TileMap.prototype.nearestFeature = function (point) {
      var mapData = this.geoJson;
      var distance = Infinity;
      var nearest;

      if (point.lng < -180 || point.lng > 180) {
        return;
      }

      for (var i = 0; i < mapData.features.length; i++) {
        var dist = point.distanceTo(mapData.features[i].properties.latLng);
        if (dist < distance) {
          distance = dist;
          nearest = mapData.features[i];
        }
      }
      nearest.properties.eventDistance = distance;

      return nearest;
    };

    /**
     * display tooltip if feature is close enough to event latlng
     *
     * @method tooltipProximity
     * @param latlng {Leaflet Object}
     * @param zoom {Number}
     * @param feature {geoJson Object}
     * @param map {Leaflet Object}
     * @return boolean
     */
    TileMap.prototype.tooltipProximity = function (latlng, zoom, feature, map) {
      if (!feature) return;

      var showTip = false;

      // zoomScale takes map zoom and returns proximity value for tooltip display
      // domain (input values) is map zoom (min 1 and max 18)
      // range (output values) is distance in meters
      // used to compare proximity of event latlng to feature latlng
      var zoomScale = d3.scale.linear()
      .domain([1, 4, 7, 10, 13, 16, 18])
      .range([1000000, 300000, 100000, 15000, 2000, 150, 50]);

      var proximity = zoomScale(zoom);
      var distance = latlng.distanceTo(feature.properties.latLng);

      // maxLngDif is max difference in longitudes
      // to prevent feature tooltip from appearing 360°
      // away from event latlng
      var maxLngDif = 40;
      var lngDif = Math.abs(latlng.lng - feature.properties.latLng.lng);

      if (distance < proximity && lngDif < maxLngDif) {
        showTip = true;
      }

      delete feature.properties.eventDistance;

      var testScale = d3.scale.pow().exponent(0.2)
      .domain([1, 18])
      .range([1500000, 50]);
      return showTip;
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
     * retuns data for data for heat map intensity
     * if heatNormalizeData attribute is checked/true
     • normalizes data for heat map intensity
     *
     * @param mapData {geoJson Object}
     * @param nax {Number}
     * @method dataToHeatArray
     * @return {Array}
     */
    TileMap.prototype.dataToHeatArray = function (max) {
      var self = this;
      var mapData = this.geoJson;

      return mapData.features.map(function (feature) {
        var lat = feature.geometry.coordinates[1];
        var lng = feature.geometry.coordinates[0];
        var heatIntensity;

        if (!self._attr.heatNormalizeData) {
          // show bucket value on heatmap
          heatIntensity = feature.properties.value;
        } else {
          // show bucket value normalized to max value
          heatIntensity = parseInt(feature.properties.value / max * 100);
        }

        return [lat, lng, heatIntensity];
      });
    };

    /**
     * geohashMinDistance returns a min distance in meters for sizing
     * circle markers to fit within geohash grid rectangle
     *
     * @method geohashMinDistance
     * @param feature {Object}
     * @return {Number}
     */
    TileMap.prototype.geohashMinDistance = function (feature) {
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
