define(function (require) {
  require('ui/modules')
  .get('kibana')
  .directive('visEditorAggAdd', function (Private) {
    const AggConfig = Private(require('ui/Vis/AggConfig'));

    return {
      restrict: 'E',
      template: require('plugins/kibana/visualize/editor/agg_add.html'),
      controllerAs: 'add',
      controller: function ($scope) {
        const self = this;

        self.form = false;
        self.submit = function (schema) {
          self.form = false;

          const aggConfig = new AggConfig($scope.vis, {
            schema: schema
          });
          aggConfig.brandNew = true;

          $scope.vis.aggs.push(aggConfig);
        };
      }
    };
  });
});
