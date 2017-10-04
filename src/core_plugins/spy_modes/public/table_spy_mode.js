// import 'ui/agg_table';
import { AggResponseTabifyProvider } from 'ui/agg_response/tabify/tabify';
import tableSpyModeTemplate from 'plugins/spy_modes/table_spy_mode.html';
import { SpyModesRegistryProvider } from 'ui/registry/spy_modes';

function VisSpyTableProvider(Notifier, $filter, $rootScope, config, Private) {
  const tabifyAggResponse = Private(AggResponseTabifyProvider);
  const PER_PAGE_DEFAULT = 10;

  return {
    name: 'table',
    display: 'Table',
    order: 1,
    template: tableSpyModeTemplate,
    link: function tableLinkFn($scope) {
      $rootScope.$watchMulti.call($scope, [
        'vis',
        'visData'
      ], function () {
        if (!$scope.vis || !$scope.visData) {
          $scope.table = null;
        } else {
          if (!$scope.spy.params.spyPerPage) {
            $scope.spy.params.spyPerPage = PER_PAGE_DEFAULT;
          }

          $scope.table = tabifyAggResponse($scope.vis, $scope.searchSource.rawResponse, {
            canSplit: false,
            asAggConfigResults: true,
            partialRows: true
          });
        }
      });
    }
  };
}

SpyModesRegistryProvider.register(VisSpyTableProvider);
