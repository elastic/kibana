define(function (require) {
  function VisSpyTableProvider(Notifier, $filter, $rootScope, config, Private) {
    var _ = require('lodash');
    var saveAs = require('file_saver');
    var tabifyAggResponse = Private(require('components/agg_response/tabify/tabify'));

    var PER_PAGE_DEFAULT = 10;

    require('components/agg_table/agg_table');

    return {
      name: 'table',
      display: 'Table',
      order: 1,
      template: require('text!components/visualize/spy/_table.html'),
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

            $scope.table = tabifyAggResponse($scope.vis, $scope.esResp, { canSplit: false });
          }
        });
      }
    };
  }

  require('registry/spy_modes').register(VisSpyTableProvider);
});
