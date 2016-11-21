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
      sort="contextAppRoute.state.sort"
    >`
  ),
});


function ContextAppRouteController($routeParams, $scope, AppState, indexPattern) {
  this.state = new AppState(createDefaultAppState());
  $scope.$watchGroup([
    'contextAppRoute.state.columns',
    'contextAppRoute.state.size',
    'contextAppRoute.state.sort',
  ], () => this.state.save());
  this.anchorUid = getDocumentUid($routeParams.type, $routeParams.id);
  this.indexPattern = indexPattern;
}

function createDefaultAppState() {
  return {
    columns: ['_source'],
    size: 5,
    sort: ['@timestamp', 'desc'],
  };
}
