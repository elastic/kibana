define(function (require) {
  function VisSpyTableProvider(Notifier, $filter, $rootScope, config, Private) {
    const _ = require('lodash');
    const saveAs = require('@spalger/filesaver').saveAs;
    const tabifyAggResponse = Private(require('ui/agg_response/tabify/tabify'));

    const PER_PAGE_DEFAULT = 10;

    require('ui/agg_table');

    return {
      name: 'table',
      display: 'Table',
      order: 1,
      template: require('plugins/spyModes/tableSpyMode.html'),
      link: function tableLinkFn($scope, $el) {
        $rootScope.$watchMulti.call($scope, [
          'vis',
          'esResp'
        ], function () {
          if (!$scope.vis || !$scope.esResp) {
            $scope.table = null;
          } else {
            if (!$scope.spy.params.spyPerPage) {
              $scope.spy.params.spyPerPage = PER_PAGE_DEFAULT;
            }

            $scope.table = tabifyAggResponse($scope.vis, $scope.esResp, {
              canSplit: false,
              asAggConfigResults: true,
              partialRows: true
            });
          }
        });
      }
    };
  }

  require('ui/registry/spy_modes').register(VisSpyTableProvider);
});
