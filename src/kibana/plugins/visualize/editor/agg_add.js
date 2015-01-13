define(function (require) {
  require('modules')
  .get('kibana')
  .directive('visEditorAggAdd', function (Private) {
    var AggConfig = Private(require('components/vis/_agg_config'));

    return {
      restrict: 'E',
      template: require('text!plugins/visualize/editor/agg_add.html'),
      controllerAs: 'add',
      controller: function ($scope) {
        var self = this;

        self.form = false;
        self.submit = function (schema) {
          self.form = false;

          var aggConfig = new AggConfig($scope.vis, {
            schema: schema
          });
          aggConfig.brandNew = true;

          $scope.vis.aggs.push(aggConfig);
        };
      }
    };
  });
});