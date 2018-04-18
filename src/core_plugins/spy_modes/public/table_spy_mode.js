// import 'ui/agg_table';
import { tabifyAggResponse } from 'ui/agg_response/tabify/tabify';
import tableSpyModeTemplate from './table_spy_mode.html';
import { SpyModesRegistryProvider } from 'ui/registry/spy_modes';

function VisSpyTableProvider(Notifier, $filter, $rootScope) {
  const PER_PAGE_DEFAULT = 10;

  return {
    name: 'table',
    display: 'Table',
    order: 1,
    template: tableSpyModeTemplate,
    showMode: vis => vis.type.requestHandler === 'courier' && vis.type.requiresSearch,
    link: function tableLinkFn($scope) {
      $rootScope.$watchMulti.call($scope, [
        'vis',
        'searchSource.rawResponse'
      ], function () {
        if (!$scope.vis || !$scope.searchSource.rawResponse) {
          $scope.table = null;
        } else {
          $scope.rowsPerPage = PER_PAGE_DEFAULT;

          $scope.table = tabifyAggResponse($scope.vis.getAggConfig().getResponseAggs(), $scope.searchSource.rawResponse, {
            canSplit: false,
            asAggConfigResults: true,
            partialRows: true,
            isHierarchical: $scope.vis.isHierarchical()
          });
        }
      });
    }
  };
}

SpyModesRegistryProvider.register(VisSpyTableProvider);
