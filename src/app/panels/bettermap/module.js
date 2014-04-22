/** @scratch /panels/5
 * include::panels/bettermap.asciidoc[]
 */

/** @scratch /panels/bettermap/0
 * == Bettermap
 * Status: *Experimental*
 *
 * Bettermap is called bettermap for lack of a better name. Bettermap uses geographic coordinates to
 * create clusters of markers on map and shade them orange, yellow and green depending on the
 * density of the cluster.
 *
 * To drill down, click on a cluster. The map will be zoomed and the cluster broken into smaller cluster.
 * When it no longer makes visual sense to cluster, individual markers will be displayed. Hover over
 * a marker to see the tooltip value.
 *
 * Bettermap also supports selection of one or more geo regions by drawing a polygon on the maps. The
 * polygon will be added as a filter to the current filter set. Removing a polygon can be done both on
 * the map and by removing the filter in the filter panel.
 *
 * IMPORTANT: bettermap requires an internet connection to download its map panels.
 */
define([
  'angular',
  'app',
  'lodash',
  './leaflet/leaflet',
  'require',

  'css!./module.css',
  'css!./leaflet/leaflet.css',
  'css!./leaflet/leaflet.draw.css',
  'css!./leaflet/MarkerCluster.css',
  'css!./leaflet/MarkerCluster.Default.css'
],
function (angular, app, _, L, localRequire) {
  'use strict';

  var module = angular.module('kibana.panels.bettermap', []);
  app.useModule(module);

  module.controller('bettermap', function($scope, querySrv, dashboard, filterSrv) {
    $scope.panelMeta = {
      editorTabs : [
        {
          title: 'Queries',
          src: 'app/partials/querySelect.html'
        }
      ],
      modals : [
        {
          description: "Inspect",
          icon: "icon-info-sign",
          partial: "app/partials/inspector.html",
          show: $scope.panel.spyable
        }
      ],
      status  : "Experimental",
      description : "Displays geo points in clustered groups on a map. The cavaet for this panel is"+
        " that, for better or worse, it does NOT use the terms facet and it <b>does</b> query "+
        "sequentially. This however means that it transfers more data and is generally heavier to"+
        " compute, while showing less actual data. If you have a time filter, it will attempt to"+
        " show to most recent points in your search, up to your defined limit"
    };
    
    // Set and populate defaults
    var _d = {
      /** @scratch /panels/bettermap/3
       * === Parameters
       *
       * field:: The field that contains the coordinates, in geojson format. GeoJSON is
       * +[longitude,latitude]+ in an array. This is different from most implementations, which use
       * latitude, longitude.
       */
      field   : null,
      /** @scratch /panels/bettermap/5
       * size:: The number of documents to use when drawing the map
       */
      size    : 1000,
      /** @scratch /panels/bettermap/5
       * spyable:: Should the `inspect` icon be shown?
       */
      spyable : true,
      /** @scratch /panels/bettermap/5
       * tooltip:: Which field to use for the tooltip when hovering over a marker
       */
      tooltip : "_id",
      /** @scratch /panels/bettermap/5
       * ==== Queries
       * queries object:: This object describes the queries to use on this panel.
       * queries.mode::: Of the queries available, which to use. Options: +all, pinned, unpinned, selected+
       * queries.ids::: In +selected+ mode, which query ids are selected.
       */
      queries     : {
        mode        : 'all',
        ids         : []
      },
    };

    _.defaults($scope.panel,_d);

    // in order to use relative paths in require calls, require needs a context to run. Without
    // setting this property the paths would be relative to the app not this context/file.
    $scope.requireContext = localRequire;

    $scope.init = function() {
      $scope.$on('refresh',function(){
        $scope.get_data();
      });
      $scope.get_data();
    };
    
    $scope.get_data = function(segment,query_id) {
      $scope.require(['./leaflet/leaflet.markercluster', './leaflet/leaflet.draw'], function () {
        $scope.panel.error =  false;

        // Make sure we have everything for the request to complete
        if(dashboard.indices.length === 0) {
          return;
        }

        if(_.isUndefined($scope.panel.field)) {
          $scope.panel.error = "Please select a field that contains geo point in [lon,lat] format";
          return;
        }

        // Determine the field to sort on
        var timeField = _.uniq(_.pluck(filterSrv.getByType('time'),'field'));
        if(timeField.length > 1) {
          $scope.panel.error = "Time field must be consistent amongst time filters";
        } else if(timeField.length === 0) {
          timeField = null;
        } else {
          timeField = timeField[0];
        }

        var _segment = _.isUndefined(segment) ? 0 : segment;

        $scope.panel.queries.ids = querySrv.idsByMode($scope.panel.queries);
        var queries = querySrv.getQueryObjs($scope.panel.queries.ids);

        var boolQuery = $scope.ejs.BoolQuery();
        _.each(queries,function(q) {
          boolQuery = boolQuery.should(querySrv.toEjsObj(q));
        });

        var request = $scope.ejs.Request().indices(dashboard.indices[_segment])
          .query($scope.ejs.FilteredQuery(
            boolQuery,
            filterSrv.getBoolFilter(filterSrv.ids()).must($scope.ejs.ExistsFilter($scope.panel.field))
          ))
          .fields([$scope.panel.field,$scope.panel.tooltip])
          .size($scope.panel.size);

        if(!_.isNull(timeField)) {
          request = request.sort(timeField,'desc');
        }

        $scope.populate_modal(request);

        var results = request.doSearch();

        // Populate scope when we have results
        results.then(function(results) {
          $scope.panelMeta.loading = false;

          if(_segment === 0) {
            $scope.hits = 0;
            $scope.data = [];
            query_id = $scope.query_id = new Date().getTime();
          }

          // Check for error and abort if found
          if(!(_.isUndefined(results.error))) {
            $scope.panel.error = $scope.parse_error(results.error);
            return;
          }

          // Check that we're still on the same query, if not stop
          if($scope.query_id === query_id) {

            // Keep only what we need for the set
            $scope.data = $scope.data.slice(0,$scope.panel.size).concat(_.map(results.hits.hits, function(hit) {
              return {
                coordinates : new L.LatLng(hit.fields[$scope.panel.field][1],hit.fields[$scope.panel.field][0]),
                tooltip : hit.fields[$scope.panel.tooltip]
              };
            }));

          } else {
            return;
          }

          $scope.$emit('draw');

          // Get $size results then stop querying
          if($scope.data.length < $scope.panel.size && _segment+1 < dashboard.indices.length) {
            $scope.get_data(_segment+1,$scope.query_id);
          }

        });
      });
    };

    $scope.populate_modal = function(request) {
      $scope.inspector = angular.toJson(JSON.parse(request.toString()),true);
    };

  });

  module.directive('bettermap', function(filterSrv) {
    return {
      restrict: 'A',
      link: function(scope, elem) {
        elem.html('<center><img src="img/load_big.gif"></center>');

        // Receive render events
        scope.$on('draw',function(){
          render_panel();
        });

        scope.$on('render', function(){
          if(!_.isUndefined(map)) {
            map.invalidateSize();
            map.getPanes();
          }
        });

        var map, makersLayerGroup, currentLayersByFilterId;

        function render_panel() {
          elem.css({height:scope.row.height});

          scope.require(['./leaflet/leaflet.markercluster', './leaflet/leaflet.draw'], function () {
            scope.panelMeta.loading = false;
            L.Icon.Default.imagePath = 'app/panels/bettermap/leaflet/images';
            if(_.isUndefined(map)) {
              createMap();
              // The layer that will hold our markers
              makersLayerGroup = new L.MarkerClusterGroup({maxClusterRadius:30});
              // This will hold the list of current layers, mapped to their respective filter ids
              currentLayersByFilterId = {};
            } else {
              makersLayerGroup.clearLayers();
            }

            var markerList = [];

            _.each(scope.data, function(p) {
              if(!_.isUndefined(p.tooltip) && p.tooltip !== '') {
                var title = p.tooltip;
                var marker = L.marker(p.coordinates, { title: title});
                markerList.push(marker.bindPopup(p.tooltip));
              } else {
                markerList.push(L.marker(p.coordinates));
              }
            });

            makersLayerGroup.addLayers(markerList);

            makersLayerGroup.addTo(map);

            map.fitBounds(_.pluck(scope.data,'coordinates'));
          });
        }
        
        function createMap() {
          map = L.map(scope.$id, {
            scrollWheelZoom: true,
            center: [40, -86],
            zoom: 10
          });

          // Initialise the FeatureGroup to store editable layers
          var drawnItems = new L.FeatureGroup();
          map.addLayer(drawnItems);
          
          // Initialise the draw control and pass it the FeatureGroup of editable layers
          var drawControl = new L.Control.Draw({
            edit: {
              featureGroup: drawnItems
            },
            draw: {
              polyline: false,
              marker: false,
              circle: false
            }
          });

          map.addControl(drawControl);
          
          // Watch for new polygons drawn on the map, and update filters accordingly
          map.on('draw:created', function (e) {
              var layer = e.layer;

              var filterId = filterSrv.set(
                {
                  type : 'geo_polygon',
                  field : scope.panel.field,
                  value : layer.toGeoJSON().geometry.coordinates[0],
                  mandate : ('either')
                }
              );
              layer.filterId = filterId;
              drawnItems.addLayer(layer);
              currentLayersByFilterId[filterId] = layer;
            }
          );

          // Watch for polygons deleted from the map, and update filters accordingly
          map.on('draw:deleted', function (e) {
            var layers = e.layers;
            layers.eachLayer(function (layer) {
              filterSrv.remove(layer.filterId);
            });
            
          });
          
          // Watch for polygons edited on the map, and update the existing accordingly
          map.on('draw:edited', function (e) {
              var layers = e.layers;
              layers.eachLayer(
                function (layer) {
                  console.log("Polygon was edited, filter id " + layer.filterId);
                  filterSrv.set(
                    {
                      type:'geo_polygon',
                      field:scope.panel.field,
                      value:layer.toGeoJSON().geometry.coordinates[0],
                      mandate:('either')
                    },
                    layer.filterId);
                }
              );
            }
          );
          
          // Watch for changes in the list of filters, and remove filters from the map if needed to
          // keep filter list consistent with the map
          scope.$watch(filterSrv.ids, function(newValue) {
            if (_.isUndefined(newValue)) {
              return;
            }
            
            for (var id in currentLayersByFilterId) {
              if ( !(_.contains(newValue, parseInt(id, 10))) ) {
                map.removeLayer(currentLayersByFilterId[id]);
              }
            }
          });

          // set a default osm_url if there is none
          if (_.isUndefined(scope.panel.osm_url) || _.isNull(scope.panel.osm_url)) {
            scope.panel.osm_url = "http://otile1.mqcdn.com/tiles/1.0.0/map/{z}/{x}/{y}.jpg";
          }

          L.tileLayer(scope.panel.osm_url, {
            attribution: '"Data, imagery and map information provided by MapQuest, '+
              'OpenStreetMap <http://www.openstreetmap.org/copyright> and contributors, ODbL',
            maxZoom: 18,
            minZoom: 2
          }).addTo(map);
        }
      }
    };
  });

});
