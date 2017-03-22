import _ from 'lodash';
import $ from 'jquery';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import Visualization from '../components/visualization';
import addScope from '../lib/add_scope';
import modules from 'ui/modules';
import createBrushHandler from '../lib/create_brush_handler';
const app = modules.get('apps/metrics/directives');
app.directive('metricsVisualization', (timefilter, $timeout) => {
  return {
    restrict: 'E',
    link: ($scope, $el) => {
      const addToState = ['model', 'visData', 'reversed'];
      const Component = addScope(Visualization, $scope, addToState);
      const handleBrush = createBrushHandler($scope, timefilter);
      render(<Component onBrush={handleBrush} className="dashboard__visualization"/>, $el[0]);
      $scope.$on('$destroy', () => unmountComponentAtNode($el[0]));

      // For Metrics, Gauges and markdown visualizations we want to hide the
      // panel title because it just doens't make sense to show it.
      // This is wrapped in a timeout so it happens after the directive is mouted.
      // otherwise the .panel might not be available.
      $timeout(() => {
        const panel = $($el[0]).parents('.panel');
        if (panel.length) {
          const panelHeading = panel.find('.panel-heading');
          const panelTitle = panel.find('.panel-title');
          const matchingTypes = ['metric', 'gauge', 'markdown'];
          if (panelHeading.length && panelTitle.length && _.contains(matchingTypes, $scope.model.type)) {
            panel.css({ position: 'relative' });
            panelHeading.css({
              position: 'absolute',
              top: 0,
              right: 0,
              zIndex: 100
            });
            panelTitle.css({ display: 'none' });
          }
        }
      }, 1);
    }
  };
});

