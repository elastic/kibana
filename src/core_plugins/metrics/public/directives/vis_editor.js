import _ from 'lodash';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import modules from 'ui/modules';
import VisEditor from '../components/vis_editor/vis_editor';
import addScope from '../lib/add_scope';
import angular from 'angular';
const app = modules.get('apps/metrics/directives');
app.directive('metricsVisEditor', () => {
  return {
    restrict: 'E',
    link: ($scope, $el, $attrs) => {
      const addToState = ['fields', 'model', 'visData'];
      const Component = addScope(VisEditor, $scope, addToState);
      const handleChange = part => {
        $scope.$evalAsync(() => angular.copy(part, $scope.model));
      };
      render(<Component onChange={handleChange} />, $el[0]);
      $scope.$on('$destroy', () => {
        unmountComponentAtNode($el[0]);
      });
    }
  };
});

