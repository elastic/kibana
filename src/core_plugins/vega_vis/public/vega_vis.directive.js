import { uiModules } from 'ui/modules';

import { createVegaVisController } from './vega_vis.controller.js';
import './vega_vis.less';
import template from './vega_vis.template.html';

uiModules.get('kibana')
  .directive('vegaVis', () => ({
    restrict: 'E',
    controller: createVegaVisController,
    controllerAs: 'vegavis',
    scope: {
      vis: '='
    },
    template,
    bindToController: true,
    link($scope, ...args) {
      $scope.vegavis.link($scope, ...args);
    }
  }));
