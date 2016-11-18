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
      columns="['_source']"
      index-pattern="contextAppRoute.indexPattern"
      size="5"
      sort="['@timestamp', 'desc']"
    >`
  ),
});


function ContextAppRouteController($routeParams, indexPattern) {
  this.anchorUid = getDocumentUid($routeParams.type, $routeParams.id);
  this.indexPattern = indexPattern;
}
