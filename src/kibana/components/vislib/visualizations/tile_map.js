define(function (require) {
  return function TileMapFactory(d3, Private, config) {
    var _ = require('lodash');
    var $ = require('jquery');
    var L = require('mapbox');
  
    var Chart = Private(require('components/vislib/visualizations/_chart'));
    var errors = require('errors');

    require('css!components/vislib/styles/main');
    
    var mapdata;
    var mapcenter = [41, -100];
    var mapzoom = 4;
    var tiles = config.get('mapbox:tiles');
    var apiKey = config.get('mapbox:apiKey');
    L.mapbox.accessToken = apiKey;

    /**
     * Tile Map Visualization: renders maps
     *
     * @class TileMap
     * @constructor
     * @extends Chart
     * @param handler {Object} Reference to the Handler Class Constructor
     * @param el {HTMLElement} HTML element to which the chart will be appended
     * @param chartData {Object} Elasticsearch query results for this specific chart
     */
    
    _(TileMap).inherits(Chart);
    function TileMap(handler, chartEl, chartData) {
      if (!(this instanceof TileMap)) {
        return new TileMap(handler, chartEl, chartData);
      }
      TileMap.Super.apply(this, arguments);
    }

    /**
     * Renders tile map
     *
     * @method draw
     * @param selection
     * @returns {Function} Creates the map
     */
    TileMap.prototype.draw = function () {
      
      // Attributes
      var self = this;
      var $elem = $(this.chartEl);
      var div;
      var min;
      var max;
      var length;
      var featureLayer;
      var bounds;
      
      return function (selection) {

        selection.each(function (data) {

          div = $(this);
          div.addClass('tilemap');

          var map = L.mapbox.map(div[0], tiles)
            .setView(mapcenter, mapzoom);
          map.options.minZoom = 1;
          map.options.maxZoom = 10;
          var zoomScale = self.zoomScale(mapzoom);

          if (data.geoJSON) {
            mapdata = data.geoJSON;
            min = mapdata.properties.min;
            max = mapdata.properties.max;
            length = mapdata.features.length;
            //console.log(' min:', min, ' max:', max, ' length:', length);

            // add geohash data to tile map
            featureLayer = L.geoJson(mapdata, {
              pointToLayer: function (feature, latlng) {
                var count = feature.properties.count;
                var rad = zoomScale * self.radiusScale(count, max) * Math.sqrt(count);
                return L.circleMarker(latlng, {
                  radius: rad
                });
              },
              onEachFeature: function (feature, layer) {
                self.onEachFeature(feature, layer);
              },
              style: function (feature) {
                return {
                  // color: feature.properties.color,
                  fillColor: '#00529b',
                  color: '#00529b',
                  weight: 1,
                  opacity: 1,
                  fillOpacity: 0.7
                };
              }
            }).addTo(map);

            map.fitBounds(featureLayer.getBounds());
            bounds = map.getBounds();
            self.redrawFeatures(map, featureLayer, bounds);
            
          }

          map.on('zoomend dragend', function () {
            mapzoom = map.getZoom();
            bounds = map.getBounds();
            self.redrawFeatures(map, featureLayer, bounds);
          });

          return div;
        });
      };
    };

    /**
     * Redraws feature layer
     *
     * @method draw
     * @param selection
     * @returns {Function} Creates the map
     */
    TileMap.prototype.redrawFeatures = function (map, featureLayer, bounds) {
      var self = this;
      var zoomScale = self.zoomScale(mapzoom);
      var max = mapdata.properties.max;

      featureLayer.eachLayer(function (layer) {
        var latlng = L.latLng(layer.feature.geometry.coordinates[1], layer.feature.geometry.coordinates[0]);
        // do not draw features outside of bounds
        //if (bounds.contains(latlng)) {
        //console.log('in', latlng);
        //} else {
        //console.log('out', latlng);
        //}
        var count = layer.feature.properties.count;
        var rad = zoomScale * self.radiusScale(count, max) * Math.sqrt(count);
        layer.setRadius(rad);
      });
    };

    /**
     * Binds popup to each feature
     *
     * @method onEachFeature
     * @param feature {Object}
     * @param layer {Object}
     * returns layer (Object} with popup
     */
    TileMap.prototype.onEachFeature = function (feature, layer) {
      layer.bindPopup(feature.properties.geohash + ': ' + feature.properties.count);
    };

    /**
     * zoomScale
     *
     * @method radiusScale
     * @param value {Number}
     * @param max {Number}
     * @return {Number}
     */
    TileMap.prototype.zoomScale = function (zoom) {
      var zScale = d3.scale.pow()
        .exponent(4)
        .domain([2, 10])
        .range([0.01, 2]);
      return zScale(zoom);
    };

    /**
     * Return radius multiplier
     *
     * @method radiusScale
     * @param value {Number}
     * @param max {Number}
     * @return {Number}
     */
    TileMap.prototype.radiusScale = function (value, max) {
      var rScale = d3.scale.linear()
        .domain([0, max])
        .range([2, 20])
        .clamp(true);
      // needs more work
      // console.log('radiusScale', value, max, rScale(value));
      // return rScale(value);
      return 1;
    };

    return TileMap;
  };
});
