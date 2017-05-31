import _ from 'lodash';

import { FilterBarQueryFilterProvider } from 'ui/filter_bar/query_filter';
import uiRoutes from 'ui/routes';

import './app';
import { getDocumentUid } from './api/utils/ids';
import contextAppRouteTemplate from './index.html';


uiRoutes
.when('/context/:indexPatternId/:type/:id', {
  controller: ContextAppRouteController,
  controllerAs: 'contextAppRoute',
  resolve: {
    indexPattern: function ($route, courier) {
      return courier.indexPatterns.get($route.current.params.indexPatternId);
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
  Private,
) {
  const queryFilter = Private(FilterBarQueryFilterProvider);

  this.state = new AppState(createDefaultAppState(config, indexPattern));
  this.state.save(true);

  $scope.$watchGroup([
    'contextAppRoute.state.columns',
    'contextAppRoute.state.predecessorCount',
    'contextAppRoute.state.successorCount',
  ], () => this.state.save(true));

  $scope.$listen(queryFilter, 'update', () => {
    this.filters = _.cloneDeep(queryFilter.getFilters());
  });

  this.anchorUid = getDocumentUid($routeParams.type, $routeParams.id);
  this.indexPattern = indexPattern;
  this.discoverUrl = chrome.getNavLinkById('kibana:discover').lastSubUrl;
  this.filters = _.cloneDeep(queryFilter.getFilters());
}

function createDefaultAppState(config, indexPattern) {
  return {
    columns: ['_source'],
    filters: [],
    predecessorCount: parseInt(config.get('context:defaultSize'), 10),
    sort: [indexPattern.timeFieldName, 'desc'],
    successorCount: parseInt(config.get('context:defaultSize'), 10),
  };
}
