define(function (require) {
  function VisSpyTableProvider(Notifier, $filter, $rootScope, config, Private) {
    var _ = require('lodash');
    var saveAs = require('@spalger/filesaver').saveAs;
    var tabifyAggResponse = Private(require('ui/agg_response/tabify/tabify'));

    var PER_PAGE_DEFAULT = 10;

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
            if (!$scope.editableVis.params.spyPerPage) {
              $scope.editableVis.params.spyPerPage = PER_PAGE_DEFAULT;
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
