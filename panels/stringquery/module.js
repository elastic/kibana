angular.module('kibana.stringquery', [])
.controller('stringquery', function($scope, eventBus) {

  // Set and populate defaults
  var _d = {
    label   : "Search",
    query   : "*",
    size    : 100,
    sort    : ['_score','desc'],
    group   : "default",
    multi   : false,
    multi_arrange: 'horizontal',
  }
  _.defaults($scope.panel,_d);

  $scope.init = function() {

    // If we're in multi query mode, they all get wiped out if we receive a 
    // query. Query events must be exchanged as arrays.
    eventBus.register($scope,'query',function(event,query) {
      $scope.panel.query = query;
    });   
  }

  $scope.send_query = function(query) {
    var _query = _.isArray(query) ? query : [query]
    eventBus.broadcast($scope.$id,$scope.panel.group,'query',_query)
  }

  $scope.add_query = function() {
    if (_.isArray($scope.panel.query))
      $scope.panel.query.push("")
    else {
      $scope.panel.query = new Array($scope.panel.query)
      $scope.panel.query.push("")
    }
  }

  $scope.set_multi = function(multi) {
    $scope.panel.query = multi ? 
      new Array($scope.panel.query) : $scope.panel.query[0];
  }

  $scope.set_sort = function(field) {
    if($scope.panel.sort[0] === field)
      $scope.panel.sort[1] = $scope.panel.sort[1] == 'asc' ? 'desc' : 'asc';
    else
      $scope.panel.sort[0] = field;
  }

  $scope.remove_query = function(index) {
    $scope.panel.query.splice(index,1);
  }

});