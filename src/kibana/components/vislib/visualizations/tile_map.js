define(function (require) {
  return function TileMapFactory(d3, Private) {
    var _ = require('lodash');
    var $ = require('jquery');
    var L = require('leaflet');

    var Chart = Private(require('components/vislib/visualizations/_chart'));
    var errors = require('errors');

    require('css!components/vislib/styles/main');

    var mapCenter = [15, 5];
    var mapZoom = 2;

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

      // clean up old maps
      self.destroy();

      // create a new maps array
      self.maps = [];

      var worldBounds = L.latLngBounds([-90, -220], [90, 220]);

      return function (selection) {
        selection.each(function (data) {

          if (self._attr.mapZoom) {
            mapZoom = self._attr.mapZoom;
          }
          if (self._attr.mapCenter) {
            mapCenter = self._attr.mapCenter;
          }

          var mapData = data.geoJson;
          var div = $(this).addClass('tilemap');

          var featureLayer;
          var tileLayer = L.tileLayer('https://otile{s}-s.mqcdn.com/tiles/1.0.0/map/{z}/{x}/{y}.jpeg', {
            attribution: 'Tiles by <a href="http://www.mapquest.com/">MapQuest</a> &mdash; ' +
              'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
              '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
            subdomains: '1234'
          });

          var mapOptions = {
            minZoom: 1,
            maxZoom: 18,
            layers: tileLayer,
            center: mapCenter,
            zoom: mapZoom,
            noWrap: true,
            maxBounds: worldBounds,
            scrollWheelZoom: false,
            fadeAnimation: false
          };

          var map = L.map(div[0], mapOptions);

          tileLayer.on('tileload', function () {
            self.saturateTiles();
          });

          featureLayer = self.markerType(map, mapData).addTo(map);

          map.on('unload', function () {
            tileLayer.off('tileload', self.saturateTiles);
          });

          map.on('moveend', function setZoomCenter() {
            mapZoom = self._attr.mapZoom = map.getZoom();
            mapCenter = self._attr.mapCenter = map.getCenter();
          });

          // add label for splits
          if (mapData.properties.label) {
            self.addLabel(mapData.properties.label, map);
          }

          // Add button to fit container to points
          var FitControl = L.Control.extend({
            options: {
              position: 'topleft'
            },
            onAdd: function (map) {
              var container = L.DomUtil.create('div', 'leaflet-control leaflet-bar leaflet-control-zoom leaflet-control-fit');
              $(container).html('<a class="leaflet-control-zoom fa fa-crop" title="Fit Data Bounds"></a>');
              $(container).on('click', function () {
                self.fitBounds(map, featureLayer);
              });
              return container;
            }
          });

          if (mapData && mapData.features.length > 0) {
            map.addControl(new FitControl());
          }

          self.maps.push(map);
        });
      };
    };

    /**
     * zoom map to fit all features in featureLayer
     *
     * @method fitBounds
     * @param map {Object}
     * @param featureLayer {Leaflet object}
     * @return {Leaflet object} featureLayer
     */
    TileMap.prototype.fitBounds = function (map, featureLayer) {

      map.fitBounds(featureLayer.getBounds());
    };

    /**
     * remove css class on map tiles
     *
     * @method saturateTiles
     * @return {Leaflet object} featureLayer
     */
    TileMap.prototype.saturateTiles = function () {
      if (!this._attr.isDesaturated) {
        $('img.leaflet-tile-loaded').addClass('filters-off');
      }
    };

    /**
     * Switch type of data overlay for map:
     * creates featurelayer from mapData (geoJson)
     *
     * @method markerType
     * @param map {Object}
     * @param mapData {Object}
     * @return {Leaflet object} featureLayer
     */
    TileMap.prototype.markerType = function (map, mapData) {
      var featureLayer;
      if (mapData) {
        if (this._attr.mapType === 'Scaled Circle Markers') {
          featureLayer = this.scaledCircleMarkers(map, mapData);
        } else if (this._attr.mapType === 'Shaded Circle Markers') {
          featureLayer = this.shadedCircleMarkers(map, mapData);
        } else if (this._attr.mapType === 'Shaded Geohash Grid') {
          featureLayer = this.shadedGeohashGrid(map, mapData);
        } else {
          featureLayer = this.pinMarkers(mapData);
        }
      }

      return featureLayer;
    };

    /**
     * Type of data overlay for map:
     * creates featurelayer from mapData (geoJson)
     * with default leaflet pin markers
     *
     * @method pinMarkers
     * @param mapData {Object}
     * @return {Leaflet object} featureLayer
     */
    TileMap.prototype.pinMarkers = function (mapData) {
      var self = this;

      var featureLayer = L.geoJson(mapData, {
        onEachFeature: function (feature, layer) {
          self.bindPopup(feature, layer);
        }
      });

      return featureLayer;
    };

    /**
     * Type of data overlay for map:
     * creates featurelayer from mapData (geoJson)
     * with circle markers that are scaled to illustrate values
     *
     * @method scaledCircleMarkers
     * @param map {Object}
     * @param mapData {Object}
     * @return {Leaflet object} featureLayer
     */
    TileMap.prototype.scaledCircleMarkers = function (map, mapData) {
      var self = this;

      // super min and max from all chart data
      var min = mapData.properties.allmin;
      var max = mapData.properties.allmax;

      var radiusScaler = 2.5;

      var featureLayer = L.geoJson(mapData, {
        pointToLayer: function (feature, latlng) {
          var count = feature.properties.count;
          var scaledRadius = self.radiusScale(count, max, feature) * 2;
          return L.circle(latlng, scaledRadius);
        },
        onEachFeature: function (feature, layer) {
          self.bindPopup(feature, layer);
        },
        style: function (feature) {
          return self.applyShadingStyle(feature, min, max);
        }
      });

      // add legend
      if (mapData.features.length > 1) {
        self.addLegend(mapData, map);
      }

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
     * @return {Leaflet object} featureLayer
     */
    TileMap.prototype.shadedCircleMarkers = function (map, mapData) {
      var self = this;

      // super min and max from all chart data
      var min = mapData.properties.allmin;
      var max = mapData.properties.allmax;

      var featureLayer = L.geoJson(mapData, {
        pointToLayer: function (feature, latlng) {
          var count = feature.properties.count;
          var radius = self.geohashMinDistance(feature);
          return L.circle(latlng, radius);
        },
        onEachFeature: function (feature, layer) {
          self.bindPopup(feature, layer);
        },
        style: function (feature) {
          return self.applyShadingStyle(feature, min, max);
        }
      });

      // add legend
      if (mapData.features.length > 1) {
        self.addLegend(mapData, map);
      }

      return featureLayer;
    };

    /**
     * Type of data overlay for map:
     * creates featurelayer from mapData (geoJson)
     * with rectangles that show the geohash grid bounds
     *
     * @method geohashGrid
     * @param map {Object}
     * @param mapData {Object}
     * @return {undefined}
     */
    TileMap.prototype.shadedGeohashGrid = function (map, mapData) {
      var self = this;

      // super min and max from all chart data
      var min = mapData.properties.allmin;
      var max = mapData.properties.allmax;

      var bounds;

      var featureLayer = L.geoJson(mapData, {
        pointToLayer: function (feature, latlng) {
          var geohashRect = feature.properties.rectangle;
          // get bounds from northEast[3] and southWest[1]
          // points in geohash rectangle
          var bounds = [
            [geohashRect[3][1], geohashRect[3][0]],
            [geohashRect[1][1], geohashRect[1][0]]
          ];
          return L.rectangle(bounds);
        },
        onEachFeature: function (feature, layer) {
          self.bindPopup(feature, layer);
          layer.on({
            mouseover: function (e) {
              var layer = e.target;
              // bring layer to front if not older browser
              if (!L.Browser.ie && !L.Browser.opera) {
                layer.bringToFront();
              }
            }
          });
        },
        style: function (feature) {
          return self.applyShadingStyle(feature, min, max);
        }
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
        var i = 0;
        var vals;
        var strokecol;

        if (data.properties.min === data.properties.max) {
          // 1 val for legend
          vals = self._attr.cScale.invertExtent(colors[i]);
          strokecol = self.darkerColor(colors[i]);
          labels.push(
            '<i style="background:' + colors[i] + ';border-color:' + strokecol + '"></i> ' +
            vals[0].toFixed(0));
        } else {
          // 3 to 5 vals for legend
          if (colors) {
            for (i = 0; i < colors.length; i++) {
              vals = self._attr.cScale.invertExtent(colors[i]);
              strokecol = self.darkerColor(colors[i]);
              labels.push('<i style="background:' + colors[i] + ';border-color:' +
              strokecol + '"></i> ' + vals[0].toFixed(0) + ' &ndash; ' + vals[1].toFixed(0));
            }
          }
        }
        div.innerHTML = labels.join('<br>');

        return div;
      };
      legend.addTo(map);
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
    TileMap.prototype.applyShadingStyle = function (feature, min, max) {
      var self = this;
      var count = feature.properties.count;
      var color = self.quantizeColorScale(count, min, max);

      return {
        fillColor: color,
        color: self.darkerColor(color),
        weight: 1.5,
        opacity: 1,
        fillOpacity: 0.75
      };
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
      layer.bindPopup(popup)
      .on('mouseover', function (e) {
        layer.openPopup();
      })
      .on('mouseout', function (e) {
        layer.closePopup();
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
     * radiusScale returns a number for scaled circle markers
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
    TileMap.prototype.radiusScale = function (count, max, feature) {
      // exp = 0.5 for square root ratio
      // exp = 1 for linear ratio
      var exp = 0.6;
      var maxr = this.geohashMinDistance(feature);
      return Math.pow(count, exp) / Math.pow(max, exp) * maxr;
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
      var reds5 = ['#fed976', '#feb24c', '#fd8d3c', '#f03b20', '#bd0026'];
      var reds3 = ['#fecc5c', '#fd8d3c', '#e31a1c'];
      var reds1 = ['#ff6128'];
      var colors = this._attr.colors = reds5;

      if (max - min < 3) {
        colors = this._attr.colors = reds1;
      } else if (max - min < 25) {
        colors = this._attr.colors = reds3;
      }

      var cScale = this._attr.cScale = d3.scale.quantize()
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
     * clean up the maps
     *
     * @method destroy
     * @return {undefined}
     */
    TileMap.prototype.destroy = function () {
      this.maps.forEach(function (map) {
        map.remove();
      });
    };

    return TileMap;

  };
});
