import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { uiModules } from 'ui/modules';
import VisEditor from '../components/vis_editor';
import addScope from '../lib/add_scope';
import angular from 'angular';
import createBrushHandler from '../lib/create_brush_handler';
const app = uiModules.get('apps/metrics/directives');
app.directive('metricsVisEditor', (timefilter) => {
  return {
    restrict: 'E',
    link: ($scope, $el) => {
      const addToState = ['autoApply', 'dirty', 'embedded', 'fields', 'visData'];
      const Component = addScope(VisEditor, $scope, addToState);
      const handleBrush = createBrushHandler($scope, timefilter);
      const handleChange = part => {
        $scope.$evalAsync(() => angular.copy(part, $scope.model));
      };
      const handleCommit = () => {
        $scope.$evalAsync(() => $scope.commit());
      };
      const handleToggleAutoApply = () => {
        $scope.$evalAsync(() => $scope.toggleAutoApply());
      };
      render(<Component
        model={$scope.model}
        onCommit={handleCommit}
        onToggleAutoApply={handleToggleAutoApply}
        onChange={handleChange}
        onBrush={handleBrush} />, $el[0]);
      $scope.$on('$destroy', () => {
        unmountComponentAtNode($el[0]);
      });
    }
  };
});

