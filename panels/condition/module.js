/*jshint globalstrict:true */
/*global angular:true */
/*

  ## Conditions
  
  a simple text field to input a filter expression.
  
  Author: Andre Kullmann

  ### Parameters
  * label ::  The label to stick over the field 
*/

'use strict';

angular.module('kibana.condition', [])
.controller('condition', function($scope, dashboard, filterSrv) {

  $scope.panelMeta = {
    status  : "Experimental",
    description : ""
  };

  // Set and populate defaults
  var _d = {
    label   : "Condition",
    history : [],
    remember: 10 // max: 100, angular strap can't take a variable for items param
  };
  _.defaults($scope.panel,_d);
  
  $scope.filterSrv = filterSrv;

  $scope.init = function() {
    $scope.conditionId     = null;
  };

  var isBlank = function(str) {
    return (!str || /^\s*$/.test(str));
  }
  
  $scope.refresh = function() {
	var id  = $scope.conditionId;
	var blank = isBlank( $scope.conditionString );
	//alert("id:" + id + " blank:" + blank );
	
	if( id != null && blank ) {
	  filterSrv.remove( id );
	  id = null;
	} else if( id == null ) {
		id = filterSrv.set({
		  type:  'querystring',
		  query: $scope.conditionString
		} );	
	} else {	
		id = filterSrv.set({
		  type:  'querystring',
		  query: $scope.conditionString
		}, id );
	}
	$scope.conditionId = id;
	
	dashboard.refresh();	
  };

});