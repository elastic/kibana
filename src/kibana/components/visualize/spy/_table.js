define(function (require) {
  function VisSpyTableProvider(Notifier, $filter, $rootScope, config, Private) {
    var _ = require('lodash');
    var saveAs = require('file_saver');
    var tabifyAggResponse = Private(require('components/agg_response/tabify/tabify_agg_response'));

    var PER_PAGE_DEFAULT = 10;
    var PER_PAGE_EXTENDED = 20;

    require('components/agg_table/agg_table');

    return {
      name: 'table',
      display: 'Table',
      order: 1,
      template: require('text!components/visualize/spy/_table.html'),
      link: function tableLinkFn($scope, $el) {
        $scope.$parent.$watch('spyMode.fill', function (fill) {
          $scope.perPage = (fill) ? PER_PAGE_EXTENDED : PER_PAGE_DEFAULT;
        });

        $rootScope.$watchMulti.call($scope, [
          'vis',
          'esResp'
        ], function () {
          if (!$scope.vis || !$scope.esResp) {
            $scope.rows = $scope.columns = null;
            return;
          }

          var tabbed = tabifyAggResponse($scope.vis, $scope.esResp, { canSplit: false });
          $scope.rows = tabbed.rows;
          $scope.columns = tabbed.columns;
        });
      }
    };
  }

  require('registry/spy_modes').register(VisSpyTableProvider);
});
