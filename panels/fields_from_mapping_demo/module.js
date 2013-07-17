/*

  ## Fields

  Allows for enabling and disabling of fields in the table panel as well as a 
  micro anaylsis panel for analyzing the events in the table panel

  ### Parameters
  * style :: a hash containing css styles
  * arrange :: the layout pf the panel 'horizontal' or 'vertical'
  * micropanel_position :: where to place the micropanel in relation to the field
  
  ### Group Events
  #### Recieves
  * table_documents :: An object containing the documents in the table panel
  #### Sends
  * fields :: an object containing the sort order, existing fields and selected fields

*/
angular.module('kibana.fields_from_mapping_demo', [])

.controller('fields_from_mapping_demo', function($scope, fields_from_mapping, dashboard) {

  // Set and populate defaults
  var _d = {
    status  : "Beta",
    group   : "default",
    style   : {},
    arrange : 'vertical'
  }
  _.defaults($scope.panel,_d);

  $scope.init = function() {
    $scope.fields = [];

    $scope.$on("refresh", function() {
      $scope.refresh_fields();
    });
    
    $scope.refresh_fields();
  }

  $scope.refresh_fields = function() {
    fields_from_mapping.field_names_for_indices(dashboard.indices, function(fields){
      $scope.fields = fields.sort();
    });
  }
})
