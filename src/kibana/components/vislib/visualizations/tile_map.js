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
      
    var mapTiles = config.get('mapbox:tiles');
    var apiKey = config.get('mapbox:apiKey');
    L.mapbox.accessToken = apiKey;

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
    _(TileMap).inherits(Chart);
    function TileMap(handler, chartEl, chartData) {
      if (!(this instanceof TileMap)) {
        return new TileMap(handler, chartEl, chartData);
      }
      TileMap.Super.apply(this, arguments);
      
      // add allmin and allmax to geoJSON
      var mapDataExtents = handler.data.mapDataExtents(handler.data.data.raw);
      chartData.geoJSON.properties.allmin = mapDataExtents[0];
      chartData.geoJSON.properties.allmax = mapDataExtents[1];

      // turn off resizeChecker for tile maps
      this.handler.vis.resizeChecker.off('resize', this.resize);
      this.handler.vis.resizeChecker.destroy();
    }

    /**
     * Renders tile map
     *
     * @method draw
     * @param selection
     * @return {Function} Creates the map
     */
    TileMap.prototype.draw = function () {
      var self = this;
      var $elem = $(this.chartEl);
      var div;
      var worldBounds = L.latLngBounds([-200, -220], [200, 220]);
      var mapOptions = {
        minZoom: 2,
        maxZoom: 10,
        continuousWorld: true,
        noWrap: true,
        maxBounds: worldBounds
      };
      return function (selection) {
        selection.each(function (data) {
          div = $(this);
          div.addClass('tilemap');
          var map = L.mapbox.map(div[0], mapTiles, mapOptions)
            .setView(mapcenter, mapzoom);
          L.control.scale().addTo(map);

          // TODO: need to add UI options to allow 
          // users to select one of these four map types
          if (data.geoJSON) {
            // this._attr;
            // self.clusterMarkers(map, data.geoJSON);
            // self.heatMap(map, data.geoJSON);
            // self.scaledCircleMarkers(map, data.geoJSON);
            self.quantizeCircleMarkers(map, data.geoJSON);
          }
          if (data.geoJSON.properties.label) {
            self.addLabel(data.geoJSON.properties.label, map);
          }
        });
      };
    };

    /**
     * Adds label div to each map when data is split
     *
     * @method addLabel
     * @param mapLabel {String}
     * @param map {Object}
     * @return {undefined}
     */
    TileMap.prototype.addLabel = function (mapLabel, map) {
      var label = L.control();
      label.onAdd = function () {
        this._div = L.DomUtil.create('div', 'tilemap-info tilemap-label');
        this.update();
        return this._div;
      };
      label.update = function () {
        this._div.innerHTML = '<h2>' + mapLabel + '</h2>';
      };
      label.addTo(map);
    };

    /**
     * Adds legend div to each map when data is split
     * uses d3 scale from TileMap.prototype.quantizeColorScale
     *
     * @method addLegend
     * @param data {Object}
     * @param map {Object}
     * @return {undefined}
     */
    TileMap.prototype.addLegend = function (data, map) {
      var self = this;
      var legend = L.control({position: 'bottomright'});
      legend.onAdd = function () {
        var div = L.DomUtil.create('div', 'tilemap-legend');
        var colors = self._attr.colors;
        var labels = [];
        for (var i = 0; i < colors.length; i++) {
          var vals = self._attr.cScale.invertExtent(colors[i]);
          var strokecol = self.darkerColor(colors[i]);
          labels.push(
            '<i style="background:' + colors[i] + ';border-color:' + strokecol + '"></i> ' +
            vals[0].toFixed(1) + ' &ndash; ' + vals[1].toFixed(1));
        }
        div.innerHTML = labels.join('<br>');
        return div;
      };
      legend.addTo(map);
    };

    /**
     * Type of data overlay for map:
     * uses leaflet plug-in to create featurelayer from mapData (geoJSON)
     * with clustered markers that change with the map zoom
     *
     * @method clusterMarkers
     * @param map {Object}
     * @param mapData {Object}
     * @return {undefined}
     */
    TileMap.prototype.clusterMarkers = function (map, mapData) {
      var self = this;
      self._attr.maptype = 'clusterMarkers';
      var min = mapData.properties.min;
      var max = mapData.properties.max;
      var length = mapData.properties.length;
      var precision = mapData.properties.precision;
      // console.log('clusterMarkers: features:', length, ' precision:', precision, ' min value:', min, ' max value:', max);
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
    };

    /**
     * Type of data overlay for map:
     * uses leaflet plug-in to create featurelayer from mapData (geoJSON)
     * with heatmap to illustrate values
     *
     * @method heatMap
     * @param map {Object}
     * @param mapData {Object}
     * @return {undefined}
     */
    TileMap.prototype.heatMap = function (map, mapData) {
      // TODO: pass in maxHeatZoom value from UI slider
      var self = this;
      var maxHeatZoom = 7;
      self._attr.maptype = 'heatMap';
      var min = mapData.properties.min;
      var max = mapData.properties.max;
      var length = mapData.properties.length;
      var precision = mapData.properties.precision;
      // console.log('heatMap: features:', length, ' precision:', precision, ' min value:', min, ' max value:', max);
      var featureLayer = L.geoJson(mapData);
      var heat = L.heatLayer([], {
        maxZoom: maxHeatZoom
      }).addTo(map);
      featureLayer.eachLayer(function (layer) {
        heat.addLatLng(layer.getLatLng());
      });
      map.fitBounds(featureLayer.getBounds());
    };

    /**
     * Type of data overlay for map:
     * creates featurelayer from mapData (geoJSON)
     * with circle markers that are scaled to illustrate values
     *
     * @method scaledCircleMarkers
     * @param map {Object}
     * @param mapData {Object}
     * @return {undefined}
     */
    TileMap.prototype.scaledCircleMarkers = function (map, mapData) {
      var self = this;
      self._attr.maptype = 'scaledCircleMarkers';
      var min = mapData.properties.min;
      var max = mapData.properties.max;
      var length = mapData.properties.length;
      var precision = mapData.properties.precision;
      // console.log('scaledCircleMarkers: features:', length, ' precision:', precision, ' min value:', min, ' max value:', max);
      var zoomScale = self.zoomScale(mapzoom);
      var bounds;
      var defaultColor = '#005baa';
      var featureLayer = L.geoJson(mapData, {
        pointToLayer: function (feature, latlng) {
          var count = feature.properties.count;
          
          var rad = zoomScale * self.radiusScale(count, max, precision);
          return L.circleMarker(latlng, {
            radius: rad
          });
        },
        onEachFeature: function (feature, layer) {
          self.bindPopup(feature, layer);
        },
        style: function (feature) {
          var count = feature.properties.count;
          return {
            // color: feature.properties.color,
            fillColor: defaultColor,
            color: self.darkerColor(defaultColor),
            weight: 1.4,
            opacity: 1,
            fillOpacity: 0.7
          };
        }
      }).addTo(map);
      self.resizeFeatures(map, min, max, precision, featureLayer);
      map.on('zoomend dragend', function () {
        mapzoom = map.getZoom();
        bounds = map.getBounds();
        self.resizeFeatures(map, min, max, precision, featureLayer);
      });
    };

    /**
     * Type of data overlay for map:
     * creates featurelayer from mapData (geoJSON)
     * with circle markers that are shaded to illustrate values
     *
     * @method quantizeCircleMarkers
     * @param map {Object}
     * @param mapData {Object}
     * @return {undefined}
     */
    TileMap.prototype.quantizeCircleMarkers = function (map, mapData) {
      var self = this;
      self._attr.maptype = 'quantizeCircleMarkers';
      
      // TODO: add UI to select local min max or super min max

      // min and max from chart data for just this map
      // var min = mapData.properties.min;
      // var max = mapData.properties.max;
      
      // super min and max from all chart data
      var min = mapData.properties.allmin;
      var max = mapData.properties.allmax;
      
      var length = mapData.properties.length;
      var precision = mapData.properties.precision;
      // console.log('quantizeCircleMarkers: features:', length, ' precision:', precision, ' min value:', min, ' max value:', max);
      var zoomScale = self.zoomScale(mapzoom);
      var bounds;
      var defaultColor = '#005baa';
      var featureLayer = L.geoJson(mapData, {
        pointToLayer: function (feature, latlng) {
          var count = feature.properties.count;
          var rad = zoomScale * 3;
          return L.circleMarker(latlng, {
            radius: rad
          });
        },
        onEachFeature: function (feature, layer) {
          self.bindPopup(feature, layer);
        },
        style: function (feature) {
          var count = feature.properties.count;
          var color = self.quantizeColorScale(count, min, max);
          return {
            fillColor: color,
            color: self.darkerColor(color),
            weight: 1,
            opacity: 1,
            fillOpacity: 1
          };
        }
      }).addTo(map);
      self.resizeFeatures(map, min, max, precision, featureLayer);
      map.on('zoomend dragend', function () {
        mapzoom = map.getZoom();
        bounds = map.getBounds();
        self.resizeFeatures(map, min, max, precision, featureLayer);
      });
      self.addLegend(mapData, map);
    };

    /**
     * Redraws feature layer markers
     *
     * @method resizeFeatures
     * @param map {Object}
     * @param min {Number}
     * @param max {Number}
     * @param precision {Number}
     * @param featureLayer {Object}
     * @return {undefined}
     */
    TileMap.prototype.resizeFeatures = function (map, min, max, precision, featureLayer) {
      var self = this;
      var zoomScale = self.zoomScale(mapzoom);
      
      featureLayer.eachLayer(function (layer) {
        var latlng = L.latLng(layer.feature.geometry.coordinates[1], layer.feature.geometry.coordinates[0]);
        
        var count = layer.feature.properties.count;
        var rad;
        if (self._attr.maptype === 'quantizeCircleMarkers') {
          rad = zoomScale * self.quantRadiusScale(precision);
        } else {
          rad = zoomScale * self.radiusScale(count, max, precision);
        }
        layer.setRadius(rad);
      });
    };

    /**
     * Binds popup and events to each feature on map
     *
     * @method bindPopup
     * @param feature {Object}
     * @param layer {Object}
     * return {undefined}
     */
    TileMap.prototype.bindPopup = function (feature, layer) {
      // TODO: tooltip-like formatter passed in?
      layer.bindPopup(
        'Geohash: ' + feature.properties.geohash + '<br>' +
        'Center: ' + feature.properties.center[1].toFixed(1) + ', ' + feature.properties.center[0].toFixed(1) + '<br>' +
        'Count: ' + feature.properties.count
      )
      .on('mouseover', function (e) {
        layer.openPopup();
      })
      .on('mouseout', function (e) {
        layer.closePopup();
      });
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
      var zScale = d3.scale.pow()
        .exponent(4)
        .domain([1, 12])
        .range([0.3, 100]);
      return zScale(zoom);
    };

    /**
     * radiusScale returns a circle radius from
     * approx. square root of count 
     * which is multiplied by a factor based on the geohash precision
     * for relative sizing of markers
     *
     * @method radiusScale
     * @param count {Number}
     * @param max {Number}
     * @param precision {Number}
     * @return {Number}
     */
    TileMap.prototype.radiusScale = function (count, max, precision) {
      // exp = 0.5 for true square root ratio
      // exp = 1 for linear ration
      var exp = 0.6;
      var maxr;
      switch (precision) {
        case 1:
          maxr = 200;
          break;
        case 2:
          maxr = 30;
          break;
        case 3:
          maxr = 9;
          break;
        case 4:
          maxr = 3;
          break;
        case 5:
          maxr = 1.44;
          break;
        case 6:
          maxr = 1.13;
          break;
        default:
          maxr = 9;
      }
      return Math.pow(count, exp) / Math.pow(max, exp) * maxr;
    };

    /**
     * returns a number to scale circle markers 
     * based on the geohash precision
     *
     * @method quantRadiusScale
     * @param precision {Number}
     * @return {Number}
     */
    TileMap.prototype.quantRadiusScale = function (precision) {
      var maxr;
      switch (precision) {
        case 1:
          maxr = 100;
          break;
        case 2:
          maxr = 12;
          break;
        case 3:
          maxr = 3;
          break;
        case 4:
          maxr = 0.6;
          break;
        case 5:
          maxr = 0.3;
          break;
        case 6:
          maxr = 0.15;
          break;
        default:
          maxr = 3;
      }
      return maxr;
    };

    /**
     * d3 quantize scale returns a hex color,
     * used for marker fill color
     *
     * @method quantizeColorScale
     * @param count {Number}
     * @param min {Number}
     * @param max {Number}
     * @return {String} hex color
     */
    TileMap.prototype.quantizeColorScale = function (count, min, max) {
      var self = this;
      var greens = ['#c7e9b4', '#7fcdbb', '#41b6c4', '#2c7fb8', '#253494'];
      var reds =   ['#fed976', '#feb24c', '#fd8d3c', '#f03b20', '#bd0026'];
      var blues =  ['#9ecae1', '#6baed6', '#4292c6', '#2171b5', '#084594'];
      var colors = self._attr.colors = reds;
      var cScale = self._attr.cScale = d3.scale.quantize()
        .domain([min, max])
        .range(colors);
      return cScale(count);
    };

    /**
     * d3 method returns a darker hex color,
     * used for marker stroke color
     *
     * @method darkerColor
     * @param color {String} hex color
     * @return {String} hex color
     */
    TileMap.prototype.darkerColor = function (color) {
      var darker = d3.hcl(color).darker(1.3).toString();
      return darker;
    };

    return TileMap;

  };
});
