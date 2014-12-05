define(function (require) {
  return function TileMapFactory(d3, Private) {
    var _ = require('lodash');
    var $ = require('jquery');
    var L = require('leaflet');

    var Chart = Private(require('components/vislib/visualizations/_chart'));
    var errors = require('errors');

    require('css!components/vislib/styles/main');

    var mapData;
    var mapCenter = [15, 5];
    var mapZoom = 2;
    var minMapSize = 60;

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

      // track the map objects
      this.maps = [];

      // add allmin and allmax to geoJson
      chartData.geoJson.properties.allmin = chartData.geoJson.properties.min;
      chartData.geoJson.properties.allmax = chartData.geoJson.properties.max;
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
      var featureLayer;

      // clean up old maps
      _.invoke(self.maps, 'destroy');
      // create a new maps array
      self.maps = [];

      return function (selection) {
        selection.each(function (data) {
          div = $(this);
          div.addClass('tilemap');

          if (self._attr.lastZoom) {
            mapZoom = self._attr.lastZoom;
          }
          if (self._attr.lastCenter) {
            mapCenter = self._attr.lastCenter;
          }

          var mapLayer = L.tileLayer('http://otile{s}.mqcdn.com/tiles/1.0.0/map/{z}/{x}/{y}.jpeg', {
            attribution: 'Tiles by <a href="http://www.mapquest.com/">MapQuest</a> &mdash; ' +
              'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
              '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
            subdomains: '1234'
          });

          var mapOptions = {
            minZoom: 2,
            maxZoom: 16,
            layers: mapLayer,
            center: mapCenter,
            zoom: mapZoom,
            continuousWorld: true,
            noWrap: true,
            maxBounds: worldBounds,
            scrollWheelZoom: false,
            fadeAnimation: false
          };

          var map = L.map(div[0], mapOptions);
          self.maps.push(map);

          map.on('zoomend dragend', function () {
            mapZoom = self._attr.lastZoom = map.getZoom();
            mapCenter = self._attr.lastCenter = map.getCenter();
          });

          if (data.geoJson) {
            if (self._attr.mapType === 'Scaled Circle Markers') {
              featureLayer = self.scaledCircleMarkers(map, data.geoJson);
            } else {
              featureLayer = self.shadedCircleMarkers(map, data.geoJson);
            }
          }

          if (data.geoJson.properties.label) {
            self.addLabel(data.geoJson.properties.label, map);
          }

          // Add button to fit container to points
          var FitControl = L.Control.extend({
            options: {
              position: 'topleft'
            },
            onAdd: function (map) {
              var container = L.DomUtil.create('div', 'leaflet-control leaflet-bar leaflet-control-zoom leaflet-control-fit');
              $(container).html('<a class="leaflet-control-zoom fa fa-crop" title="Fit Data Bounds"></a>');
              $(container).on('click', fitBounds);
              return container;
            }
          });

          if (data && data.geoJson && data.geoJson.features.length > 0) {
            map.addControl(new FitControl());
          }


          function fitBounds() {
            map.fitBounds(featureLayer.getBounds());
          }
        });
      };
    };

    /**
     * Type of data overlay for map:
     * creates featurelayer from mapData (geoJson)
     * with circle markers that are scaled to illustrate values
     *
     * @method scaledCircleMarkers
     * @param map {Object}
     * @param mapData {Object}
     * @return {undefined}
     */
    TileMap.prototype.scaledCircleMarkers = function (map, mapData) {
      var self = this;
      var min = mapData.properties.min;
      var max = mapData.properties.max;
      var length = mapData.properties.length;
      var precision = mapData.properties.precision;
      var zoomScale = self.zoomScale(mapZoom);
      var bounds;
      var defaultColor = '#ff6128';
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
            fillColor: defaultColor,
            color: self.darkerColor(defaultColor),
            weight: 1.0,
            opacity: 1,
            fillOpacity: 0.7
          };
        }
      }).addTo(map);
      self.resizeFeatures(map, min, max, precision, featureLayer);
      map.on('zoomend dragend', function () {
        mapZoom = map.getZoom();
        bounds = map.getBounds();
        self.resizeFeatures(map, min, max, precision, featureLayer);
      });

      return featureLayer;
    };

    /**
     * Type of data overlay for map:
     * creates featurelayer from mapData (geoJson)
     * with circle markers that are shaded to illustrate values
     *
     * @method shadedCircleMarkers
     * @param map {Object}
     * @param mapData {Object}
     * @return {undefined}
     */
    TileMap.prototype.shadedCircleMarkers = function (map, mapData) {
      var self = this;

      // TODO: add UI to select local min max or all min max

      // min and max from chart data for this map
      // var min = mapData.properties.min;
      // var max = mapData.properties.max;

      // super min and max from all chart data
      var min = mapData.properties.allmin;
      var max = mapData.properties.allmax;

      var length = mapData.properties.length;
      var precision = mapData.properties.precision;
      var zoomScale = self.zoomScale(mapZoom);
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
            weight: 1.0,
            opacity: 1,
            fillOpacity: 0.7
          };
        }
      }).addTo(map);
      self.resizeFeatures(map, min, max, precision, featureLayer);
      map.on('zoomend dragend', function () {
        mapZoom = map.getZoom();
        bounds = map.getBounds();
        self.resizeFeatures(map, min, max, precision, featureLayer);
      });

      // add legend
      if (mapData.features.length > 1) {
        self.addLegend(mapData, map);
      }

      return featureLayer;
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
      label.setPosition('bottomright').addTo(map);
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
     * Invalidate the size of the map, so that leaflet will resize to fit.
     * then moves to center
     *
     * @return {undefined}
     */
    TileMap.prototype.resizeArea = function () {
      this.maps.forEach(function (map) {
        map.invalidateSize({
          debounceMoveend: true
        });
      });
    };

    /**
     * Redraws feature layer markers
     *
     * @method resizeFeatures
     * @param map {Object}
     * @param min {Number}
     * @param max {Number}
     * @param precision {Number}
     * @param featureLayer {GeoJson Object}
     * @return {undefined}
     */
    TileMap.prototype.resizeFeatures = function (map, min, max, precision, featureLayer) {
      var self = this;
      var zoomScale = self.zoomScale(mapZoom);

      featureLayer.eachLayer(function (layer) {
        var latlng = L.latLng(layer.feature.geometry.coordinates[1], layer.feature.geometry.coordinates[0]);

        var count = layer.feature.properties.count;
        var rad;
        if (self._attr.mapType === 'Shaded Circle Markers') {
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
      var props = feature.properties;
      var popup = L.popup({
        autoPan: false
      })
      .setContent(
        'Geohash: ' + props.geohash + '<br>' +
        'Center: ' + props.center[1].toFixed(1) + ', ' + props.center[0].toFixed(1) + '<br>' +
        props.valueLabel + ': ' + props.count
      );

      // TODO: tooltip-like formatter passed in?
      layer.bindPopup(popup)
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
      // exp = 1 for linear ratio
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
          maxr = 1.12;
          break;
        case 7:
          maxr = 0.6;
          break;
        case 8:
          maxr = 0.3;
          break;
        case 9:
          maxr = 0.22;
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
          maxr = 0.22;
          break;
        case 7:
          maxr = 0.18;
          break;
        case 8:
          maxr = 0.16;
          break;
        case 9:
          maxr = 0.14;
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

      if (max === min) {
        return colors[0];
      } else {
        return cScale(count);
      }
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

    /**
     * tell leaflet that it's time to cleanup the map
     */
    TileMap.prototype.destroy = function () {
      this.maps.forEach(function (map) {
        map.remove();
      });
    };

    return TileMap;

  };
});
