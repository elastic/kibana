define(function (require) {
  return function TileMapFactory(d3, Private) {
    var _ = require('lodash');
    var $ = require('jquery');
    var L = require('leaflet');
    require('leaflet-draw');

    var Dispatch = Private(require('components/vislib/lib/dispatch'));
    var Chart = Private(require('components/vislib/visualizations/_chart'));

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

      this.tooltipFormatter = chartData.tooltipFormatter;

      this.events = new Dispatch(handler);

      // add allmin and allmax to geoJson
      var allMinMax = this.getMinMax(handler.data.data);
      chartData.geoJson.properties.allmin = allMinMax.min;
      chartData.geoJson.properties.allmax = allMinMax.max;
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
      self.popups = [];

      var worldBounds = L.latLngBounds([-90, -220], [90, 220]);

      return function (selection) {
        selection.each(function (chart) {

          if (self._attr.mapZoom) {
            mapZoom = self._attr.mapZoom;
          }
          if (self._attr.mapCenter) {
            mapCenter = self._attr.mapCenter;
          }

          var mapData = chart.geoJson;
          var div = $(this).addClass('tilemap');

          var featureLayer;
          var tileLayer = L.tileLayer('https://otile{s}-s.mqcdn.com/tiles/1.0.0/map/{z}/{x}/{y}.jpeg', {
            attribution: 'Tiles by <a href="http://www.mapquest.com/">MapQuest</a> &mdash; ' +
              'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
              '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
            subdomains: '1234'
          });


          var drawOptions = {draw: {}};
          _.each(['polyline', 'polygon', 'circle', 'marker', 'rectangle'], function (drawShape) {
            if (!self.events.listenerCount(drawShape)) {
              drawOptions.draw[drawShape] = false;
            } else {
              drawOptions.draw[drawShape] = {
                shapeOptions: {
                  stroke: false,
                  color: '#000'
                }
              };
            }
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
            fadeAnimation: false,
          };

          var map = L.map(div[0], mapOptions);

          if (mapData.features.length) {
            map.addControl(new L.Control.Draw(drawOptions));
          }

          tileLayer.on('tileload', function () {
            self.saturateTiles();
          });

          featureLayer = self.markerType(map, chart).addTo(map);

          map.on('unload', function () {
            tileLayer.off('tileload', self.saturateTiles);
          });

          map.on('moveend', function setZoomCenter() {
            mapZoom = self._attr.mapZoom = map.getZoom();
            mapCenter = self._attr.mapCenter = map.getCenter();
            featureLayer.clearLayers();
            featureLayer = self.markerType(map, chart).addTo(map);
          });

          map.on('draw:created', function (e) {
            var drawType = e.layerType;
            if (!self.events.listenerCount(drawType)) return;

            // TODO: Different drawTypes need differ info. Need a switch on the object creation
            var bounds = e.layer.getBounds();

            self.events.emit(drawType, {
              e: e,
              data: self.chartData,
              bounds: {
                top_left: {
                  lat: bounds.getNorthWest().lat,
                  lon: bounds.getNorthWest().lng
                },
                bottom_right: {
                  lat: bounds.getSouthEast().lat,
                  lon: bounds.getSouthEast().lng
                }
              }
            });
          });

          // add title for splits
          if (chart.title) {
            self.addTitle(chart.title, map);
          }

          var fitContainer = L.DomUtil.create('div', 'leaflet-control leaflet-bar leaflet-control-zoom leaflet-control-fit');

          if (mapData && mapData.features.length > 0) {
            // Add button to fit container to points
            var FitControl = L.Control.extend({
              options: {
                position: 'topleft'
              },
              onAdd: function (map) {
                $(fitContainer).html('<a class="leaflet-control-zoom fa fa-crop" title="Fit Data Bounds"></a>');
                $(fitContainer).on('click', function () {
                  self.fitBounds(map, featureLayer);
                });
                return fitContainer;
              },
              onRemove: function (map) {
                $(fitContainer).off('click');
              }
            });
            map.fitControl = new FitControl();
            map.addControl(map.fitControl);
          } else {
            map.fitControl = undefined;
          }

          self.maps.push(map);
        });
      };
    };

    /**
     * Return features within the map bounds
     */
    TileMap.prototype._filterToMapBounds = function (map) {
      return function (feature) {
        var coordinates = feature.geometry.coordinates;
        var p0 = coordinates[0];
        var p1 = coordinates[1];

        return map.getBounds().contains([p1, p0]);
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
    TileMap.prototype.markerType = function (map, chart) {
      if (!chart) return;

      if (this._attr.mapType === 'Scaled Circle Markers') {
        return this.scaledCircleMarkers(map, chart);
      }

      if (this._attr.mapType === 'Shaded Circle Markers') {
        return this.shadedCircleMarkers(map, chart);
      }

      if (this._attr.mapType === 'Shaded Geohash Grid') {
        return this.shadedGeohashGrid(map, chart);
      }

      return this.scaledCircleMarkers(map, chart);
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
    TileMap.prototype.scaledCircleMarkers = function (map, chart) {
      var self = this;
      var mapData = chart.geoJson;

      // super min and max from all chart data
      var min = mapData.properties.allmin;
      var max = mapData.properties.allmax;

      var radiusScaler = 2.5;

      var featureLayer = L.geoJson(mapData, {
        pointToLayer: function (feature, latlng) {
          var value = feature.properties.value;
          var scaledRadius = self.radiusScale(value, max, feature) * 2;
          return L.circle(latlng, scaledRadius);
        },
        onEachFeature: function (feature, layer) {
          self.bindPopup(feature, layer);
        },
        style: function (feature) {
          return self.applyShadingStyle(feature, min, max);
        },
        filter: self._filterToMapBounds(map)
      });

      self.addLegend(chart, map);

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
    TileMap.prototype.shadedCircleMarkers = function (map, chart) {
      var self = this;
      var mapData = chart.geoJson;
      // super min and max from all chart data
      var min = mapData.properties.allmin;
      var max = mapData.properties.allmax;

      var featureLayer = L.geoJson(mapData, {
        pointToLayer: function (feature, latlng) {
          var value = feature.properties.value;
          var radius = self.geohashMinDistance(feature);
          return L.circle(latlng, radius);
        },
        onEachFeature: function (feature, layer) {
          self.bindPopup(feature, layer);
        },
        style: function (feature) {
          return self.applyShadingStyle(feature, min, max);
        },
        filter: self._filterToMapBounds(map)
      });

      self.addLegend(chart, map);

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
    TileMap.prototype.shadedGeohashGrid = function (map, chart) {
      var self = this;
      var mapData = chart.geoJson;

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
        },
        filter: self._filterToMapBounds(map)
      });

      self.addLegend(chart, map);

      return featureLayer;
    };

    /**
     * Adds label div to each map when data is split
     *
     * @method addTitle
     * @param mapLabel {String}
     * @param map {Object}
     * @return {undefined}
     */
    TileMap.prototype.addTitle = function (mapLabel, map) {
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
     * @param mapData {geoJson Object}
     * @param map {Leaflet Object}
     * @return {undefined}
     */
    TileMap.prototype.addLegend = function (chart, map) {
      // only draw the legend for maps with multiple items
      if (chart.geoJson.features.length <= 1) return;

      var self = this;
      var isLegend = $('div.tilemap-legend', this.chartEl).length;

      if (isLegend) return; // Don't add Legend if already one

      var valueFormatter = chart.valueFormatter;
      var legend = L.control({position: 'bottomright'});

      legend.onAdd = function () {
        var $div = $('<div>').addClass('tilemap-legend');

        _.each(self._attr.colors, function (color, i) {
          var icon = $('<i>').css({
            background: color,
            'border-color': self.darkerColor(color)
          });

          var range = self._attr.cScale
          .invertExtent(color)
          .map(valueFormatter)
          .join(' – ');

          $div.append(i > 0 ? '<br>' : '').append(icon).append(range);
        });

        return $div.get(0);
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
      var value = feature.properties.value;
      var color = self.quantizeColorScale(value, min, max);

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
      var self = this;
      var lat = feature.geometry.coordinates[1];
      var lng = feature.geometry.coordinates[0];
      var latLng = L.latLng(lat, lng);

      var popup = L.popup({autoPan: false})
       .setLatLng(latLng);

      layer.bindPopup(popup)
      .on('mouseover', function (e) {
        var content = self.tooltipFormatter(feature);
        if (!content) {
          return;
        }

        popup.setContent(content);
        layer.openPopup();
      })
      .on('mouseout', function (e) {
        layer.closePopup();
      });

      this.popups.push({elem: popup, layer: layer});
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
     * approx. square root of value
     * which is multiplied by a factor based on the geohash precision
     * for relative sizing of markers
     *
     * @method radiusScale
     * @param value {Number}
     * @param max {Number}
     * @param precision {Number}
     * @return {Number}
     */
    TileMap.prototype.radiusScale = function (value, max, feature) {
      // exp = 0.5 for square root ratio
      // exp = 1 for linear ratio
      var exp = 0.6;
      var maxr = this.geohashMinDistance(feature);
      return Math.pow(value, exp) / Math.pow(max, exp) * maxr;
    };

    /**
     * d3 quantize scale returns a hex color,
     * used for marker fill color
     *
     * @method quantizeColorScale
     * @param value {Number}
     * @param min {Number}
     * @param max {Number}
     * @return {String} hex color
     */
    TileMap.prototype.quantizeColorScale = function (value, min, max) {
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
        return cScale(value);
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
      if (this.popups) {
        this.popups.forEach(function (popup) {
          popup.elem.off('mouseover').off('mouseout');
          popup.layer.unbindPopup(popup.elem);
        });
        this.popups = [];
      }

      if (this.maps) {
        this.maps.forEach(function (map) {
          if (map.fitControl) {
            map.fitControl.removeFrom(map);
          }
          map.remove();
        });
      }
    };

    return TileMap;

  };
});
