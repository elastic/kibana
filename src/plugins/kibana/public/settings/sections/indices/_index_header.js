define(function (require) {
  require('ui/modules')
  .get('apps/settings')
  .directive('kbnSettingsIndexHeader', function (config) {
    return {
      restrict: 'E',
      template: require('plugins/kibana/settings/sections/indices/_index_header.html'),
      scope: {
        indexPattern: '=',
        setDefault: '&',
        refreshFields: '&',
        delete: '&'
      },
      link: function ($scope, $el, attrs) {
        $scope.delete = attrs.delete ? $scope.delete : null;
        $scope.setDefault = attrs.setDefault ? $scope.setDefault : null;
        $scope.refreshFields = attrs.refreshFields ? $scope.refreshFields : null;
        config.$bind($scope, 'defaultIndex');
      }
    };
  });
});
