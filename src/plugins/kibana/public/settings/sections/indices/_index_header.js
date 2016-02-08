import uiModules from 'ui/modules';
import indexHeaderTemplate from 'plugins/kibana/settings/sections/indices/_index_header.html';
uiModules
.get('apps/settings')
.directive('kbnSettingsIndexHeader', function (config) {
  return {
    restrict: 'E',
    template: indexHeaderTemplate,
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
