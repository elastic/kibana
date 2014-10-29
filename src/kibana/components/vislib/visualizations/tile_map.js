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
      
      // turn off resizeChecker for tile maps
      this.handler.vis.resizeChecker.off('resize', this.resize);
      this.handler.vis.resizeChecker.destroy();

    }

    /**
     * Renders tile map
     *
     * @method draw
     * @param selection
     * @returns {Function} Creates the map
     */
    TileMap.prototype.draw = function () {
      var self = this;
      var $elem = $(this.chartEl);
      var div;

      return function (selection) {

        selection.each(function (data) {

          div = $(this);
          div.addClass('tilemap');
          var map = L.mapbox.map(div[0], tiles)
            .setView(mapcenter, mapzoom);
          map.options.minZoom = 2;
          map.options.maxZoom = 10;
          L.control.scale().addTo(map);

          if (data.geoJSON) {

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

    // Leaflet control for map label
    TileMap.prototype.addLabel = function (mapLabel, map) {
      var label = L.control();

      label.onAdd = function () {
        this._div = L.DomUtil.create('div', 'map-info map-label');
        this.update();
        return this._div;
      };

      label.update = function () {
        this._div.innerHTML = '<h2>' + mapLabel + '</h2>';
      };

      label.addTo(map);

    };

    // Leaflet control for map legend
    TileMap.prototype.addLegend = function (data, map) {
      var self = this;
      var legend = L.control({position: 'bottomright'});

      legend.onAdd = function () {
        
        var div = L.DomUtil.create('div', 'map-legend');
        var colors = self._attr.colors;
        //var breaks = [];
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

    TileMap.prototype.clusterMarkers = function (map, mapData) {
      var self = this;
      self._attr.maptype = 'clusterMarkers';
      var min = mapData.properties.min;
      var max = mapData.properties.max;
      var length = mapData.properties.length;
      var precision = mapData.properties.precision;
      console.log('\n clusterMarkers: features:', length, ' precision:', precision, ' min value:', min, ' max value:', max);
      
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
      self._attr.maptype = 'heatMap';
      var min = mapData.properties.min;
      var max = mapData.properties.max;
      var length = mapData.properties.length;
      var precision = mapData.properties.precision;
      console.log('\n heatMap: features:', length, ' precision:', precision, ' min value:', min, ' max value:', max);
      
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
      self._attr.maptype = 'scaledCircleMarkers';
      var min = mapData.properties.min;
      var max = mapData.properties.max;
      var length = mapData.properties.length;
      var precision = mapData.properties.precision;
      console.log('\n scaledCircleMarkers: features:', length, ' precision:', precision, ' min value:', min, ' max value:', max);

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
        //onEachFeature: function (feature, layer) {
        //  self.bindPopup(feature, layer);
        //},
        style: function (feature) {
          var count = feature.properties.count;
          return {
            // color: feature.properties.color,
            fillColor: defaultColor,
            color: self.darkerColor(defaultColor),
            weight: 1.5,
            opacity: 1,
            fillOpacity: 0.6
          };
        }
      }).addTo(map);

      // add events
      featureLayer.on('mouseover', function (e) {
        console.log('mouseover', e);
        //this.openPopup();
        //console.log(d3.select(this));
        //d3.select(this).data([e]).call(tooltip.render());
      });

      featureLayer.on('mouseout', function (e) {
        console.log('mouseout');
      });

      self.resizeFeatures(map, min, max, precision, featureLayer);

      map.on('zoomend dragend', function () {
        mapzoom = map.getZoom();
        bounds = map.getBounds();
        self.resizeFeatures(map, min, max, precision, featureLayer);
      });

    };

    TileMap.prototype.quantizeCircleMarkers = function (map, mapData) {
      var self = this;
      self._attr.maptype = 'quantizeCircleMarkers';
      var min = mapData.properties.min;
      var max = mapData.properties.max;
      var length = mapData.properties.length;
      var precision = mapData.properties.precision;
      console.log('\n quantizeCircleMarkers: features:', length, ' precision:', precision, ' min value:', min, ' max value:', max);

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
      console.log(featureLayer);
      
      // add events
      featureLayer.on('mouseover', function (e) {
        console.log('mouseover', e);
        //this.openPopup();
        //console.log(d3.select(this));
        //d3.select(this).data([e]).call(tooltip.render());
      });

      featureLayer.on('mouseout', function (e) {
        console.log('mouseout');
      });

            
      self.resizeFeatures(map, min, max, precision, featureLayer);

      map.on('zoomend dragend', function () {
        mapzoom = map.getZoom();
        bounds = map.getBounds();
        self.resizeFeatures(map, min, max, precision, featureLayer);
      });

      // add tooltip
      //var tooltip = this.tooltip;
      //var isTooltip = this._attr.addTooltip;

      //var mapMarkers = d3.select(self.chartEl)
      //  .select('.leaflet-overlay-pane')
      //  .selectAll('.leaflet-clickable')
      //  .datum(featureLayer._layers);

      //if (isTooltip) {
      //  mapMarkers.call(tooltip.render());
      //}

      /// add legend
      self.addLegend(mapData, map);


    };

    /**
     * Redraws feature layer
     *
     * @method draw
     * @param selection
     * @returns {Function} Creates the map
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
      var zScale = d3.scale.pow()
        .exponent(4)
        .domain([1, 12])
        .range([0.3, 100]);
      //console.log('zoomScale', zoom, zScale(zoom));
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
    TileMap.prototype.radiusScale = function (count, max, precision) {
      var maxr;
      var exp = 0.6;
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
      // pow 0.5 is sqrt
      return Math.pow(count, exp) / Math.pow(max, exp) * maxr;
      //return Math.pow(count, 0.6);
      // return Math.sqrt(count);
      //return count;

    };

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

    TileMap.prototype.quantizeColorScale = function (count, min, max) {
      var self = this;
      var greens = [
        '#c7e9b4',
        '#7fcdbb',
        '#41b6c4',
        '#2c7fb8',
        '#253494'
      ];
      var reds = [
        '#fed976',
        '#feb24c',
        '#fd8d3c',
        '#f03b20',
        '#bd0026'
      ];
      var blues = [
        '#9ecae1',
        '#6baed6',
        '#4292c6',
        '#2171b5',
        '#084594'
      ];

      var colors = self._attr.colors = reds;
      var cScale = self._attr.cScale = d3.scale.quantize()
        .domain([min, max])
        .range(colors);
      return cScale(count);

    };

    TileMap.prototype.darkerColor = function (color) {
      var darker = d3.rgb(color).darker(0.6).toString();
      return darker;

    };

    return TileMap;

  };
});
