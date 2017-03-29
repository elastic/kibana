import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import modules from 'ui/modules';
import VisEditor from '../components/vis_editor';
import addScope from '../lib/add_scope';
import angular from 'angular';
import createBrushHandler from '../lib/create_brush_handler';
const app = modules.get('apps/metrics/directives');
app.directive('metricsVisEditor', (timefilter) => {
  return {
    restrict: 'E',
    link: ($scope, $el) => {
      const addToState = ['embedded', 'fields', 'visData'];
      const Component = addScope(VisEditor, $scope, addToState);
      const handleBrush = createBrushHandler($scope, timefilter);
      const handleChange = part => {
        $scope.$evalAsync(() => angular.copy(part, $scope.model));
      };
      render(<Component model={$scope.model} onChange={handleChange} onBrush={handleBrush} />, $el[0]);
      $scope.$on('$destroy', () => {
        unmountComponentAtNode($el[0]);
      });
    }
  };
});

