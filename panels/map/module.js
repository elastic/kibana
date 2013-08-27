/*jshint globalstrict:true */
/*global angular:true */

/*

  ## Map

  ### Parameters
  * map :: 'world', 'us' or 'europe'
  * colors :: an array of colors to use for the regions of the map. If this is a 2
              element array, jquerymap will generate shades between these colors
  * size :: How big to make the facet. Higher = more countries
  * exclude :: Exlude the array of counties
  * spyable :: Show the 'eye' icon that reveals the last ES query
  * index_limit :: This does nothing yet. Eventually will limit the query to the first
                   N indices

*/

'use strict';

angular.module('kibana.map', [])
.controller('map', function($scope, $rootScope, querySrv, dashboard, filterSrv) {

  $scope.panelMeta = {
    editorTabs : [
      {title:'Queries', src:'partials/querySelect.html'}
    ],
    status  : "Stable",
    description : "Displays a map of shaded regions using a field containing a 2 letter country "+
     ", or US state, code. Regions with more hit are shaded darker. Node that this does use the"+
     " Elasticsearch terms facet, so it is important that you set it to the correct field."
  };

  // Set and populate defaults
  var _d = {
    queries     : {
      mode        : 'all',
      ids         : []
    },
    map     : "world",
    colors  : ['#A0E2E2', '#265656'],
    size    : 100,
    exclude : [],
    spyable : true,
    index_limit : 0
  };
  _.defaults($scope.panel,_d);

  $scope.init = function() {
    $scope.$on('refresh',function(){$scope.get_data();});
    $scope.get_data();
  };

  $scope.get_data = function() {

    // Make sure we have everything for the request to complete
    if(dashboard.indices.length === 0) {
      return;
    }
    $scope.panelMeta.loading = true;


    var request;
    request = $scope.ejs.Request().indices(dashboard.indices);

    $scope.panel.queries.ids = querySrv.idsByMode($scope.panel.queries);
    // This could probably be changed to a BoolFilter
    var boolQuery = $scope.ejs.BoolQuery();
    _.each($scope.panel.queries.ids,function(id) {
      boolQuery = boolQuery.should(querySrv.getEjsObj(id));
    });

    // Then the insert into facet and make the request
    request = request
      .facet($scope.ejs.TermsFacet('map')
        .field($scope.panel.field)
        .size($scope.panel.size)
        .exclude($scope.panel.exclude)
        .facetFilter($scope.ejs.QueryFilter(
          $scope.ejs.FilteredQuery(
            boolQuery,
            filterSrv.getBoolFilter(filterSrv.ids)
            )))).size(0);

    $scope.populate_modal(request);

    var results = request.doSearch();

    // Populate scope when we have results
    results.then(function(results) {
      $scope.panelMeta.loading = false;
      $scope.hits = results.hits.total;
      $scope.data = {};
      _.each(results.facets.map.terms, function(v) {
        $scope.data[v.term.toUpperCase()] = v.count;
      });
      $scope.$emit('render');
    });
  };

  // I really don't like this function, too much dom manip. Break out into directive?
  $scope.populate_modal = function(request) {
    $scope.modal = {
      title: "Inspector",
      body : "<h5>Last Elasticsearch Query</h5><pre>"+
          'curl -XGET '+config.elasticsearch+'/'+dashboard.indices+"/_search?pretty -d'\n"+
          angular.toJson(JSON.parse(request.toString()),true)+
        "'</pre>",
    };
  };

  $scope.build_search = function(field,value) {
    filterSrv.set({type:'querystring',mandate:'must',query:field+":"+value});
    dashboard.refresh();
  };

})
.directive('map', function() {
  return {
    restrict: 'A',
    link: function(scope, elem, attrs) {

      elem.html('<center><img src="common/img/load_big.gif"></center>');

      // Receive render events
      scope.$on('render',function(){
        render_panel();
      });

      // Or if the window is resized
      angular.element(window).bind('resize', function(){
        render_panel();
      });

      function render_panel() {
        // Using LABjs, wait until all scripts are loaded before rendering panel
        var scripts = $LAB.script("panels/map/lib/jquery.jvectormap.min.js").wait()
          .script("panels/map/lib/map."+scope.panel.map+".js");

        // Populate element. Note that jvectormap appends, does not replace.
        scripts.wait(function(){
          elem.text('');
          $('.jvectormap-zoomin,.jvectormap-zoomout,.jvectormap-label').remove();
          var map = elem.vectorMap({
            map: scope.panel.map,
            regionStyle: {initial: {fill: '#8c8c8c'}},
            zoomOnScroll: false,
            backgroundColor: null,
            series: {
              regions: [{
                values: scope.data,
                scale: scope.panel.colors,
                normalizeFunction: 'polynomial'
              }]
            },
            onRegionLabelShow: function(event, label, code){
              elem.children('.map-legend').show();
              var count = _.isUndefined(scope.data[code]) ? 0 : scope.data[code];
              elem.children('.map-legend').text(label.text() + ": " + count);
            },
            onRegionOut: function(event, code) {
              $('.map-legend').hide();
            },
            onRegionClick: function(event, code) {
              var count = _.isUndefined(scope.data[code]) ? 0 : scope.data[code];
              if (count !== 0) {
                scope.build_search(scope.panel.field,code);
              }
            }
          });
          elem.prepend('<span class="map-legend"></span>');
          $('.map-legend').hide();
        });
      }
    }
  };
});