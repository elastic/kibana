define(function (require) {
  'use strict';  
  var indicesByNodes = require('../transformers/indicesByNodes');
  var nodesByIndices = require('../transformers/nodesByIndices');

  // This will curry a transform function based on the view.
  return function (view, $scope) {
    var func = (view === 'indices') ? indicesByNodes : nodesByIndices;
    // we need to pass the scope to filter the data in the transformer functions
    // for the auto-complete filter.
    return func($scope);
  };
});
