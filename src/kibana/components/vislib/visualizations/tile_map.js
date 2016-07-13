define(function (require) {
  return function TileMapFactory(d3, Private, configFile) {
    var _ = require('lodash');
    var $ = require('jquery');
    var L = require('leaflet');
    var marked = require('marked');
    marked.setOptions({
      gfm: true,
      sanitize: true
    });
    require('leaflet-heat');
    require('leaflet-draw');
    require('css!components/vislib/styles/main');

    var Chart = Private(require('components/vislib/visualizations/_chart'));
    var defaultMapCenter = [15, 5];

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
    _(TileMap).inherits(Chart);
    function TileMap(handler, chartEl, chartData) {
      if (!(this instanceof TileMap)) {
        return new TileMap(handler, chartEl, chartData);
      }

      TileMap.Super.apply(this, arguments);


      // track the map objects
      this.maps = [];
      this.originalConfig = chartData || {};
      _.assign(this, this.originalConfig);
      var savedZoom = _.deepGet(this.geoJson, 'properties.zoom');
      var boundedZoom = savedZoom
        ? Math.max(Math.min(savedZoom, configFile.tilemap_max_zoom), configFile.tilemap_min_zoom)
        : configFile.tilemap_min_zoom;

      this._attr.mapZoom = boundedZoom;
      this._attr.mapCenter = _.deepGet(this.geoJson, 'properties.center') || defaultMapCenter;

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
      self.popups = [];

      var worldBounds = L.latLngBounds([-90, -220], [90, 220]);

      return function (selection) {
        selection.each(function () {
          // add leaflet latLngs to properties for tooltip
          self.addLatLng(self.geoJson);

          var div = $(this).addClass('tilemap');
          var tileLayer = L.tileLayer(configFile.tilemap_url, {
            attribution: marked(configFile.tilemap_attribution),
            subdomains: configFile.tilemap_subdomains,
            minZoom: configFile.tilemap_min_zoom,
            maxZoom: configFile.tilemap_max_zoom
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
            layers: tileLayer,
            center: self._attr.mapCenter,
            zoom: self._attr.mapZoom,
            noWrap: true,
            maxBounds: worldBounds,
            scrollWheelZoom: false,
            fadeAnimation: false,
          };

          var map = L.map(div[0], mapOptions);
          var featureLayer = self.markerType(map).addTo(map);

          if (mapData.features.length) {
            map.addControl(new L.Control.Draw(drawOptions));
          }

          function saturateTiles() {
            self.saturateTiles();
          }

          tileLayer.on('tileload', saturateTiles);

          map.on('unload', function () {
            tileLayer.off('tileload', saturateTiles);
          });

          map.on('moveend', function setZoomCenter() {
            self._attr.mapZoom = map.getZoom();
            self._attr.mapCenter = map.getCenter();

            self.hideTooltip(map);
            self.unbindPopups();

            map.removeLayer(featureLayer);
            featureLayer = self.markerType(map).addTo(map);

            self.events.emit('mapMoveEnd', {
              chart: self.originalConfig,
              zoom: self._attr.mapZoom,
              center: self._attr.mapCenter
            });
          });

          map.on('draw:created', function (e) {
            var drawType = e.layerType;
            if (!self.events.listenerCount(drawType)) return;

            // TODO: Different drawTypes need differ info. Need a switch on the object creation
            var bounds = e.layer.getBounds();

            self.events.emit(drawType, {
              e: e,
              chart: self.originalConfig,
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

          map.on('zoomend', function () {
            self.events.emit('mapZoomEnd', {
              chart: self.originalConfig,
              zoom: map.getZoom()
            });
          });

          // add title for splits
          if (self.title) {
            self.addTitle(self.title, map);
          }

          if (mapData && mapData.features.length > 0) {
            var fitContainer = L.DomUtil.create('div', 'leaflet-control leaflet-bar leaflet-control-fit');

            // Add button to fit container to points
            var FitControl = L.Control.extend({
              options: {
                position: 'topleft'
              },
              onAdd: function (map) {
                $(fitContainer).html('<a class="fa fa-crop" href="#" title="Fit Data Bounds"></a>')
                .on('click', function (e) {
                  e.preventDefault();
                  self.fitBounds(map, mapData.features);
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
     * return whether feature is within map bounds
     *
     * @method _filterToMapBounds
     * @param map {Leaflet Object}
     * @return {boolean}
     */
    TileMap.prototype._filterToMapBounds = function (map) {
      return function (feature) {
        var mapBounds = map.getBounds();
        var bucketRectBounds = feature.properties.rectangle.map(cloneAndReverse);

        return mapBounds.intersects(bucketRectBounds);
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
     * Get the Rectangles representing the geohash grid
     *
     * @return {LatLngRectangles[]}
     */
    TileMap.prototype._getDataRectangles = function () {
      return _(this.geoJson.features)
      .deepPluck('properties.rectangle')
      .map(function (rectangle) { return rectangle.map(cloneAndReverse); })
      .value();
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
     * zoom map to fit all features in featureLayer
     *
     * @method fitBounds
     * @param map {Leaflet Object}
     * @return {boolean}
     */
    TileMap.prototype.fitBounds = function (map) {
      map.fitBounds(this._getDataRectangles());
    };

    /**
     * remove css class for desat filters on map tiles
     *
     * @method saturateTiles
     * @return undefined
     */
    TileMap.prototype.saturateTiles = function () {
      if (!this._attr.isDesaturated) {
        $('img.leaflet-tile-loaded').addClass('filters-off');
      }
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
     * Checks if event latlng is within bounds of mapData
     * features and shows tooltip for that feature
     *
     * @method showTooltip
     * @param map {LeafletMap}
     * @param feature {LeafletFeature}
     * @return undefined
     */
    TileMap.prototype.showTooltip = function (map, feature) {
      if (!this.tooltipFormatter) return;

      var content = this.tooltipFormatter(feature);
      if (!content) return;

      var lat = feature.geometry.coordinates[1];
      var lng = feature.geometry.coordinates[0];
      var latLng = L.latLng(lat, lng);

      L.popup({autoPan: false})
      .setLatLng(latLng)
      .setContent(content)
      .openOn(map);
    };

    /**
     * Hides tooltip by closing popup from the map object
     *
     * @method hideTooltip
     * @return undefined
     */
    TileMap.prototype.hideTooltip = function (map) {
      map.closePopup();
    };

    /**
     * Switch type of data overlay for map:
     * creates featurelayer from mapData (geoJson)
     *
     * @method markerType
     * @param map {Leaflet Object}
     * @param mapData {geoJson Object}
     * @return {Leaflet object} featureLayer
     */
    TileMap.prototype.markerType = function (map) {
      switch (this._attr.mapType) {
        case 'Heatmap':
          return this.heatMap(map);

        case 'Shaded Circle Markers':
          return this.shadedCircleMarkers(map);

        case 'Shaded Geohash Grid':
          return this.shadedGeohashGrid(map);

        default:
          return this.scaledCircleMarkers(map);
      }
    };

    /**
     * Type of data overlay for map:
     * creates featurelayer from mapData (geoJson)
     * with circle markers that are scaled to illustrate values
     *
     * @method scaledCircleMarkers
     * @param map {Leaflet Object}
     * @param mapData {geoJson Object}
     * @return {Leaflet object} featureLayer
     */
    TileMap.prototype.scaledCircleMarkers = function (map) {
      var self = this;
      var mapData = self.geoJson;

      // super min and max from all chart data
      var min = mapData.properties.allmin;
      var max = mapData.properties.allmax;
      var zoom = map.getZoom();
      var precision = _.max(mapData.features.map(function (feature) {
        return String(feature.properties.geohash).length;
      }));

      // multiplier to reduce size of all circles
      var scaleFactor = 0.6;

      var radiusScaler = 2.5;

      var featureLayer = L.geoJson(mapData, {
        pointToLayer: function (feature, latlng) {
          var value = feature.properties.value;
          var scaledRadius = self.radiusScale(value, max, zoom, precision) * scaleFactor;
          return L.circleMarker(latlng).setRadius(scaledRadius);
        },
        onEachFeature: function (feature, layer) {
          self.bindPopup(feature, layer, map);
        },
        style: function (feature) {
          return self.applyShadingStyle(feature, min, max);
        },
        filter: self._filterToMapBounds(map)
      });

      self.addLegend(map);

      return featureLayer;
    };

    /**
     * Type of data overlay for map:
     * creates featurelayer from mapData (geoJson)
     * with circle markers that are shaded to illustrate values
     *
     * @method shadedCircleMarkers
     * @param map {Leaflet Object}
     * @param mapData {geoJson Object}
     * @return {Leaflet object} featureLayer
     */
    TileMap.prototype.shadedCircleMarkers = function (map) {
      var self = this;
      var mapData = self.geoJson;
      // super min and max from all chart data
      var min = mapData.properties.allmin;
      var max = mapData.properties.allmax;

      // multiplier to reduce size of all circles
      var scaleFactor = 0.8;

      var featureLayer = L.geoJson(mapData, {
        pointToLayer: function (feature, latlng) {
          var radius = self.geohashMinDistance(feature) * scaleFactor;
          return L.circle(latlng, radius);
        },
        onEachFeature: function (feature, layer) {
          self.bindPopup(feature, layer, map);
        },
        style: function (feature) {
          return self.applyShadingStyle(feature, min, max);
        },
        filter: self._filterToMapBounds(map)
      });

      self.addLegend(map);

      return featureLayer;
    };

    /**
     * Type of data overlay for map:
     * creates featurelayer from mapData (geoJson)
     * with rectangles that show the geohash grid bounds
     *
     * @method geohashGrid
     * @param map {Leaflet Object}
     * @param mapData {geoJson Object}
     * @return {undefined}
     */
    TileMap.prototype.shadedGeohashGrid = function (map) {
      var self = this;
      var mapData = self.geoJson;

      // super min and max from all chart data
      var min = mapData.properties.allmin;
      var max = mapData.properties.allmax;

      var bounds;

      var featureLayer = L.geoJson(mapData, {
        pointToLayer: function (feature, latlng) {
          var geohashRect = feature.properties.rectangle;
          // get bounds from northEast[3] and southWest[1]
          // corners in geohash rectangle
          var corners = [
            [geohashRect[3][1], geohashRect[3][0]],
            [geohashRect[1][1], geohashRect[1][0]]
          ];
          return L.rectangle(corners);
        },
        onEachFeature: function (feature, layer) {
          self.bindPopup(feature, layer, map);
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

      self.addLegend(map);

      return featureLayer;
    };

    /**
     * Type of data overlay for map:
     * creates canvas layer from mapData (geoJson)
     * with leaflet.heat plugin
     *
     * @method heatMap
     * @param map {Leaflet Object}
     * @param mapData {geoJson Object}
     * @return featureLayer {Leaflet object}
     */
    TileMap.prototype.heatMap = function (map) {
      var self = this;
      var mapData = this.geoJson;
      var points = this.dataToHeatArray(mapData.properties.allmax);

      var options = {
        radius: +this._attr.heatRadius,
        blur: +this._attr.heatBlur,
        maxZoom: +this._attr.heatMaxZoom,
        minOpacity: +this._attr.heatMinOpacity
      };

      var featureLayer = L.heatLayer(points, options);

      if (self._attr.addTooltip && self.tooltipFormatter && !self._attr.disableTooltips) {
        map.on('mousemove', _.debounce(mouseMoveLocation, 15, {
          'leading': true,
          'trailing': false
        }));
        map.on('mouseout', function (e) {
          self.hideTooltip(map);
        });
        map.on('mousedown', function () {
          self._attr.disableTooltips = true;
          self.hideTooltip(map);
        });
        map.on('mouseup', function () {
          self._attr.disableTooltips = false;
        });
      }

      function mouseMoveLocation(e) {
        self.hideTooltip(map);

        // unhighlight all svgs
        d3.selectAll('path.geohash', this.chartEl).classed('geohash-hover', false);

        if (!mapData.features.length || self._attr.disableTooltips) {
          return;
        }

        var latlng = e.latlng;

        // find nearest feature to event latlng
        var feature = self.nearestFeature(latlng);

        var zoom = map.getZoom();

        // show tooltip if close enough to event latlng
        if (self.tooltipProximity(latlng, zoom, feature, map)) {
          self.showTooltip(map, feature, latlng);
        }
      }

      return featureLayer;
    };

    /**
     * Adds label div to each map when data is split
     *
     * @method addTitle
     * @param mapLabel {String}
     * @param map {Leaflet Object}
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
        this._div.innerHTML = '<h2>' + _.escape(mapLabel) + '</h2>';
      };
      label.addTo(map);
    };

    /**
     * Adds legend div to each map when data is split
     * uses d3 scale from TileMap.prototype.quantizeColorScale
     *
     * @method addLegend
     * @param map {Leaflet Object}
     * @return {undefined}
     */
    TileMap.prototype.addLegend = function (map) {
      // only draw the legend for maps with multiple items
      if (this.geoJson.features.length <= 1) return;

      var self = this;
      var isLegend = $('div.tilemap-legend', this.chartEl).length;

      if (isLegend) return; // Don't add Legend if already one

      var valueFormatter = this.valueFormatter || _.identity;
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
     * @method resizeArea
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
    TileMap.prototype.bindPopup = function (feature, layer, map) {
      var self = this;
      var popup = layer.on({
        mouseover: function (e) {
          var layer = e.target;
          // bring layer to front if not older browser
          if (!L.Browser.ie && !L.Browser.opera) {
            layer.bringToFront();
          }
          var latlng = L.latLng(feature.geometry.coordinates[0], feature.geometry.coordinates[1]);
          self.showTooltip(map, feature, latlng);
        },
        mouseout: function (e) {
          self.hideTooltip(map);
        }
      });

      this.popups.push(popup);
    };

    /**
     * Unbinds the events on each of the marker layers
     *
     * @method unbindPopups
     * return {undefined}
     */
    TileMap.prototype.unbindPopups = function () {
      if (this.popups) {
        this.popups.forEach(function (popup) {
          popup.off('mouseover').off('mouseout');
        });
        this.popups = [];
      }
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
    TileMap.prototype.radiusScale = function (value, max, zoom, precision) {
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
      this.unbindPopups();

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
