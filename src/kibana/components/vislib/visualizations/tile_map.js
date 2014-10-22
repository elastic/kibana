define(function (require) {
  return function TileMapFactory(d3, Private, config) {
    var _ = require('lodash');
    var $ = require('jquery');
    var L = require('mapbox');
    require('heat');
    require('markercluster');
  
    var Chart = Private(require('components/vislib/visualizations/_chart'));
    var errors = require('errors');

    require('css!components/vislib/styles/main');
    
    var mapData;
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

      return function (selection) {

        selection.each(function (data) {

          div = $(this);
          div.addClass('tilemap');
          var map = L.mapbox.map(div[0], tiles)
            .setView(mapcenter, mapzoom);
          map.options.minZoom = 1;
          map.options.maxZoom = 10;
          L.control.scale().addTo(map);

          if (data.geoJSON) {
            self.heatMap(map, data.geoJSON);
            // self.scaledCircleMarkers(map, data.geoJSON);
            // self.clusterMarkers(map, data.geoJSON);
          }

        });
      };
    };

    TileMap.prototype.clusterMarkers = function (map, mapData) {
      var self = this;
      var min = mapData.properties.min;
      var max = mapData.properties.max;
      var length = mapData.features.length;
      var precision = mapData.features[0].properties.geohash.length;
      console.log('clusterMarkers: features:', length, ' precision:', precision, ' min value:', min, ' max value:', max);
      
      var clusterGroup = new L.MarkerClusterGroup({
        maxClusterRadius: 120,
        disableClusteringAtZoom: 9
      });
      var featureLayer = L.geoJson(mapData);
      featureLayer.eachLayer(function (layer) {
        layer.bindPopup(layer.feature.properties.geohash + ': ' + layer.feature.properties.count);
        clusterGroup.addLayer(layer);
      });
      map.addLayer(clusterGroup);

      // map.fitBounds(featureLayer.getBounds());

      // map.on('zoomend dragend', function () {
      //   mapzoom = map.getZoom();
      //   bounds = map.getBounds();
      //   console.log(mapzoom, bounds);
      // });

    };

    TileMap.prototype.heatMap = function (map, mapData) {
      var self = this;
      var min = mapData.properties.min;
      var max = mapData.properties.max;
      var length = mapData.features.length;
      var precision = mapData.features[0].properties.geohash.length;
      console.log('heatMap: features:', length, ' precision:', precision, ' min value:', min, ' max value:', max);
      
      var featureLayer = L.geoJson(mapData);
      var heat = L.heatLayer([], {
        maxZoom: 8
      }).addTo(map);
      
      featureLayer.eachLayer(function (layer) {
        heat.addLatLng(layer.getLatLng());
      });
      
      map.fitBounds(featureLayer.getBounds());

      // map.on('zoomend dragend', function () {
      //   mapzoom = map.getZoom();
      //   bounds = map.getBounds();
      //   console.log(mapzoom, bounds);
      // });

    };

    TileMap.prototype.scaledCircleMarkers = function (map, mapData) {
      
      var self = this;
      var min = mapData.properties.min;
      var max = mapData.properties.max;
      var length = mapData.features.length;
      var precision = mapData.features[0].properties.geohash.length;
      console.log('scaledCircleMarkers: features:', length, ' precision:', precision, ' min value:', min, ' max value:', max);

      var zoomScale = self.zoomScale(mapzoom);
      var bounds;
      var defaultColor = '#c90000';
            
      var featureLayer = L.geoJson(mapData, {
        pointToLayer: function (feature, latlng) {
          var count = feature.properties.count;
          var rad = zoomScale * self.radiusScale(count, max);
          return L.circleMarker(latlng, {
            radius: rad
          });
        },
        onEachFeature: function (feature, layer) {
          self.bindPopup(feature, layer);
        },
        style: function (feature) {
          return {
            // color: feature.properties.color,
            fillColor: defaultColor,
            color: defaultColor,
            weight: 1.5,
            opacity: 1,
            fillOpacity: 0.6
          };
        }
      }).addTo(map);

      self.redrawFeatures(map, mapData, featureLayer, bounds);

      map.on('zoomend dragend', function () {
        mapzoom = map.getZoom();
        bounds = map.getBounds();
        self.redrawFeatures(map, mapData, featureLayer, bounds);
      });
    };

    /**
     * Redraws feature layer
     *
     * @method draw
     * @param selection
     * @returns {Function} Creates the map
     */
    TileMap.prototype.redrawFeatures = function (map, mapData, featureLayer, bounds) {
      
      console.log('redrawFeatures');
      var self = this;
      var zoomScale = self.zoomScale(mapzoom);
      var max = mapData.properties.max;

      featureLayer.eachLayer(function (layer) {
        var latlng = L.latLng(layer.feature.geometry.coordinates[1], layer.feature.geometry.coordinates[0]);
        // do not draw features outside of bounds
        //if (bounds.contains(latlng)) {
        //console.log('in', latlng);
        //} else {
        //console.log('out', latlng);
        //}
        var count = layer.feature.properties.count;
        var rad = zoomScale * self.radiusScale(count, max);// * Math.sqrt(count);
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
    TileMap.prototype.bindPopup = function (feature, layer) {
      
      layer.bindPopup(feature.properties.geohash + ': ' + feature.properties.count);

    };

    /**
     * zoomScale uses map zoom to determine a scaling
     * factor for circle marker radius to display more
     * consistent circle size as you zoom in or out
     *
     * @method radiusScale
     * @param value {Number}
     * @param max {Number}
     * @return {Number}
     */
    TileMap.prototype.zoomScale = function (zoom) {
      
      var zs = 10 / Math.pow(zoom, 2);
      var zScale = d3.scale.pow()
        .exponent(1.5)
        .domain([1, 10])
        .range([1, 12])
        .clamp(true);
      // console.log('zoomScale', zoom, zs, zScale(zoom));
      return zScale(zoom);

    };

    /**
     * radiusScale returns a circle radius from
     * square root of value with a d3 scale using
     * max value for a relative size
     *
     * @method radiusScale
     * @param value {Number}
     * @param max {Number}
     * @return {Number}
     */
    TileMap.prototype.radiusScale = function (value, max) {
      
      //var rScale = d3.scale.pow()
      //  .exponent(2)
      //  .domain([0, max])
      //  .range([1, 10])
      //  .clamp(true);
      // console.log('radiusScale', value, max, rScale(value));
      //return rScale(value);
      var scaleMax = Math.pow(max, 3);
      var rScale = d3.scale.pow()
        .exponent(2)
        .domain([0, scaleMax])
        .range([0.5, 10])
        .clamp(true);
      // var lScale = d3.scale.linear()
      // .domain([0, Math.sqrt(max)])
      // .range([0, 20]);
      return rScale(value);

    };

    return TileMap;

  };
});
