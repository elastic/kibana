import uiRoutes from 'ui/routes';

import './app';
import { getDocumentUid } from './api/utils/ids';
import contextAppRouteTemplate from './index.html';


uiRoutes
.when('/context/:indexPattern/:type/:id', {
  controller: ContextAppRouteController,
  controllerAs: 'contextAppRoute',
  resolve: {
    indexPattern: function ($route, courier) {
      return courier.indexPatterns.get($route.current.params.indexPattern);
    },
  },
  template: contextAppRouteTemplate,
});


function ContextAppRouteController(
  $routeParams,
  $scope,
  AppState,
  chrome,
  config,
  indexPattern,
) {
  this.state = new AppState(createDefaultAppState(config));
  this.state.save(true);

  $scope.$watchGroup([
    'contextAppRoute.state.columns',
    'contextAppRoute.state.predecessorCount',
    'contextAppRoute.state.successorCount',
  ], () => this.state.save(true));
  this.anchorUid = getDocumentUid($routeParams.type, $routeParams.id);
  this.indexPattern = indexPattern;
  this.discoverUrl = chrome.getNavLinkById('kibana:discover').lastSubUrl;
}

function createDefaultAppState(config) {
  return {
    columns: ['_source'],
    predecessorCount: parseInt(config.get('context:defaultSize'), 10),
    successorCount: parseInt(config.get('context:defaultSize'), 10),
  };
}
