import uiRoutes from 'ui/routes';
import './app';
import { getDocumentUid } from './api/utils/ids';


uiRoutes
.when('/context/:indexPattern/:type/:id', {
  controller: ContextAppRouteController,
  controllerAs: 'contextAppRoute',
  resolve: {
    indexPattern: function ($route, courier, savedSearches) {
      return courier.indexPatterns.get($route.current.params.indexPattern);
    },
  },
  template: (
    `<context-app
      anchor-uid="contextAppRoute.anchorUid"
      columns="contextAppRoute.state.columns"
      index-pattern="contextAppRoute.indexPattern"
      predecessor-count="contextAppRoute.state.predecessorCount"
      successor-count="contextAppRoute.state.successorCount"
      sort="[contextAppRoute.indexPattern.timeFieldName, 'desc']"
    >`
  ),
});


function ContextAppRouteController($routeParams, $scope, AppState, config, indexPattern) {
  this.state = new AppState(createDefaultAppState(config));
  this.state.save(true);

  $scope.$watchGroup([
    'contextAppRoute.state.columns',
    'contextAppRoute.state.predecessorCount',
    'contextAppRoute.state.successorCount',
  ], () => this.state.save(true));
  this.anchorUid = getDocumentUid($routeParams.type, $routeParams.id);
  this.indexPattern = indexPattern;
}

function createDefaultAppState(config) {
  return {
    columns: ['_source'],
    predecessorCount: parseInt(config.get('context:defaultSize'), 10),
    successorCount: parseInt(config.get('context:defaultSize'), 10),
  };
}
