import uiRoutes from 'ui/routes';
import './app';
import {getDocumentUid} from './api/utils/ids';


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
      size="contextAppRoute.state.size"
      sort="[contextAppRoute.indexPattern.timeFieldName, 'desc']"
    >`
  ),
});


function ContextAppRouteController($routeParams, $scope, AppState, config, indexPattern) {
  this.state = new AppState(createDefaultAppState(config));
  $scope.$watchGroup([
    'contextAppRoute.state.columns',
    'contextAppRoute.state.size',
  ], () => this.state.save());
  this.anchorUid = getDocumentUid($routeParams.type, $routeParams.id);
  this.indexPattern = indexPattern;
}

function createDefaultAppState(config) {
  return {
    columns: ['_source'],
    size: parseInt(config.get('context:defaultSize'), 10),
  };
}
