define(function () {
  'use strict';
  // The ui had different columns in different order depending on the
  // $scope.pane.view variable. This provides a lookup for the column headers
  return {
    indices: ['Indices', 'Nodes'],
    indicesWithUnassigned: ['Indices', 'Unassigned', 'Nodes'],
    nodes: ['Nodes', 'Indices']
  };
});
