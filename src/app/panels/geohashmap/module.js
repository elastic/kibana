/**
 * == Geohashmap
 * Status: *Experimental*
 *
 * Based on the sources of the bettermap, but can handel millions of points.
 * The geohash-facet elasticsearch plugin is required.
 *
 * Open points:
 * Currentry it's hard coded at which limit the color of the points changed.
 * It should be configurable e.g. if event count < 1000 make the marker blue and if the count is > 1000 red.
 *
 * It would by nice if the marker can contains more than one event count. e.g. show the orders, customers
 * and the turnover for a area on the same marker.
 *
 * IMPORTANT: geohashmap requires an internet connection to download its map panels.
 */
define([
  'angular',
  'app',
  'underscore',
  './leaflet/leaflet-src',
  'require',

  'css!./module.css',
  'css!./leaflet/leaflet.css',
  'css!./leaflet/plugins.css'
],

function (angular, app, _, L, localRequire,dashboard) {
  'use strict';

  var module = angular.module('kibana.panels.geohashmap', []);
  app.useModule(module);

  module.controller('geohashmap', function($scope, querySrv, dashboard, filterSrv) {
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
      description : "Based on the sources of the bettermap, but can handel millions of points. " +
                     "The geohash-facet elasticsearch plugin is required. ( https://github.com/triforkams/geohash-facet )"
    };

    // Set and populate defaults
    var _d = {
      /**
       * === Parameters
       *
       * field:: The field that contains the coordinates, must be a geo_point.
       */
      field   : null,

      /**
       * spyable:: Should the `inspect` icon be shown?
       */
      spyable : true,

      /**
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

    // inorder to use relative paths in require calls, require needs a context to run. Without
    // setting this property the paths would be relative to the app not this context/file.
    $scope.requireContext = localRequire;

    $scope.init = function() {
      $scope.$on('refresh',function(){
        $scope.get_data();
      });
      $scope.get_data();
    };

    $scope.get_data = function( query_id, bounds ) {

      $scope.require([ './leaflet/plugins', './ext/elastic.js/facet/GeoHashFacet'], function () {

        $scope.panel.error =  false;
         $scope.panelMeta.loading = true;

        // Make sure we have everything for the request to complete
        if(dashboard.indices.length === 0) {
          return;
        }

        if(_.isUndefined($scope.panel.field)) {
          $scope.panel.error = "Please select a field that contains the geo_point";
          return;
        }

        $scope.panel.queries.ids = querySrv.idsByMode($scope.panel.queries);
        var queries = querySrv.getQueryObjs($scope.panel.queries.ids);

        var boolQuery = $scope.ejs.BoolQuery();

        _.each(queries,function(q) {
          boolQuery = boolQuery.should( querySrv.toEjsObj(q) );
        });


        var filter = filterSrv.getBoolFilter( filterSrv.ids );
            filter = filter.must( $scope.ejs.ExistsFilter($scope.panel.field ) );

        if( !_.isUndefined( bounds ) ) {
            var point       = bounds.getNorthWest();
            var topLeft     = $scope.ejs.GeoPoint([ point.lat, point.lng ]);
                point       = bounds.getSouthEast();
            var bottomRight = $scope.ejs.GeoPoint([ point.lat, point.lng ]);

            filter = filter.must( $scope.ejs.GeoBboxFilter( $scope.panel.field ).topLeft( topLeft ).bottomRight( bottomRight ) );
        }

        var query = $scope.ejs.FilteredQuery( boolQuery, filter );

        var request = $scope.ejs.Request().indices( dashboard.indices ).size(0);
            request = request.query( query );

        var facet = $scope.ejs.GeoHashFacet( '0' ).field( $scope.panel.field );
        request = request.facet( facet );

        $scope.populate_modal(request);

        var results = request.doSearch();

        // Populate scope when we have results
        results.then(function(results) {
            $scope.panelMeta.loading = false;
            $scope.hits = 0;
            $scope.data = [];
            query_id = $scope.query_id = new Date().getTime();

            // Check for error and abort if found
            if(!(_.isUndefined(results.error))) {
                $scope.panel.error = $scope.parse_error(results.error);
                alert('results.error');
                return;
            }

            var i = 0;
            // Keep only what we need for the set
            $scope.data = $scope.data.slice(0,$scope.panel.size).concat(_.map( results.facets['0'].clusters, function(hit) {
                return {
                    coordinates : new L.LatLng(hit.center.lat, hit.center.lon),
                    total : hit.total
                };
            }));

            $scope.$emit('draw');

        });
      });
    };

    $scope.populate_modal = function(request) {
        $scope.inspector = angular.toJson(JSON.parse(request.toString()),true);
    };

  });

  module.directive('geohashmap', function() {
    return {
      restrict: 'A',
      link: function(scope, elem, attrs) {

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


        var map, layerGroup;

        function render_panel() {
            scope.require([ './leaflet/plugins', './ext/leaflet/clusterMarker' ], function () {
                scope.panelMeta.loading = false;
                L.Icon.Default.imagePath = 'app/panels/geohashmap/leaflet/images';

                var first = _.isUndefined(map);

                if( first ) {
                    map = L.map(attrs.id, {
                        scrollWheelZoom: false,
                        center: [40, -86],
                        zoom: 10
                    });

                // This could be made configurable?
                L.tileLayer('https://ssl_tiles.cloudmade.com/57cbb6ca8cac418dbb1a402586df4528/22677/256/{z}/{x}/{y}.png', {
                    maxZoom: 18,
                    minZoom: 2
                }).addTo(map);

                layerGroup = new L.MarkerClusterGroup({
                    singleMarkerMode:true,
                    maxClusterRadius:40,
                    zoomToBoundsOnClick: false,
                    iconCreateFunction: function(cluster) {
                        var markers = cluster.getAllChildMarkers();
                        var i = 0;
                        for( var j=0;j<markers.length; j++ ) {
                           i = i + markers[j].options.total;
                        }

                    var str = '' + i;

                    var classes = 'marker-cluster ';

                    if( i > 1000000 ) {
                        str = str.substr( 0, str.length - 6 ) + 'M';
                        classes += ' marker-cluster-large';
                    } else if( i > 1000 ) {
                        str = str.substr( 0, str.length -3 ) + 'K';
                        classes += ' marker-cluster-medium';
                    } else {
                        classes += ' marker-cluster-large';
                    }

                    var html    = '<div><span>'+str+'</span></div>';

                   var icon    = L.divIcon( { html: html, className: classes, iconSize: new L.point(40,40) } );
                       return icon;
                    }
               });

                var zoomIn = function(event) {
                    map.setZoomAround( event.layer.getLatLng(), map.getZoom() + 1 );
                };

                layerGroup.on('clusterclick', zoomIn );
                layerGroup.on('click', zoomIn );

              var onZoomend = function(event) {

                  var map = event.target;
                  var bounds = map.getBounds();
                  var topLeft = bounds.getNorthWest();
                  var bottomRight = bounds.getSouthEast();

                  scope.get_data( '', bounds );
              };

              map.on('dragend', onZoomend);
              map.on('zoomend', onZoomend);

            } else {
              layerGroup.clearLayers();
            }


            var markerList = [];

            _.each(scope.data, function(p) {
                var m = new clusterMarker( p.coordinates,{ total: p.total } );
                markerList.push( m );
            });

            layerGroup.addLayers(markerList);
            layerGroup.addTo(map);

            if ( first ) {
                map.fitBounds(_.pluck(scope.data,'coordinates'));
            }
          }
          );
        }
      }
    };
  });

});
