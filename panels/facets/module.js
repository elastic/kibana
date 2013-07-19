angular.module('kibana.facets', []).controller('facets', function($scope, eventBus, fields) {

  // Set and populate defaults
  var _d = {
    query   : "*",
    size    : 20, // Number of terms in facets.
    field   : ""  // Field that is used for the facet.
  }
  
  _.defaults($scope.panel,_d)

  $scope.init = function() {
    eventBus.register($scope,'time', function(event,time){set_time(time)});
    eventBus.register($scope,'query', function(event, query) {
      $scope.panel.query = _.isArray(query) ? query[0] : query;
      $scope.get_data();
    });
    
    eventBus.broadcast($scope.$id,$scope.panel.group,'get_time')
  }

 
  $scope.get_data = function(segment,query_id) {
    if(_.isUndefined($scope.index) || _.isUndefined($scope.time))
      return

    $scope.panel.loading = true;

    // Create es query.
    var request = $scope.ejs.Request().indices($scope.index);

    var request = request
      .facet(ejs.TermsFacet('facet')
        .field($scope.panel.field)
        .size($scope.panel.size)
        .facetFilter(ejs.QueryFilter(
          ejs.FilteredQuery(
            ejs.QueryStringQuery($scope.panel.query || '*'),
            ejs.RangeFilter($scope.time.field)
              .from($scope.time.from)
              .to($scope.time.to)
            )))).size(0);

    $scope.populate_modal(request);

    var results = request.doSearch();

    results.then(function(results) {
      $scope.panel.loading = false;
      $scope.total = results.facets.facet.total;
      $scope.other = results.facets.facet.other;
      $scope.missing = results.facets.facet.missing;
      $scope.terms = results.facets.facet.terms;
      
      $scope.$emit('render')
    });
  }

  $scope.populate_modal = function(request) {
    $scope.modal = {
      title: "Inspector",
      body : "<h5>Last Elasticsearch Query</h5><pre>"+
          'curl -XGET '+config.elasticsearch+'/'+$scope.index+"/_search?pretty -d'\n"+
          angular.toJson(JSON.parse(request.toString()),true)+
        "'</pre>", 
    } 
  }

  function set_time(time) {
    $scope.time = time;
    $scope.index = _.isUndefined(time.index) ? $scope.index : time.index
    $scope.get_data();
  }

  $scope.update_query = function(term) {
    $scope.panel.query = add_to_query($scope.panel.query,$scope.panel.field,term,false)
    eventBus.broadcast($scope.$id,$scope.panel.group,'query',[$scope.panel.query]);
    $scope.get_data();
  }

});
