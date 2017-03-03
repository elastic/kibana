import uiModules from 'ui/modules';
import indexHeaderTemplate from 'plugins/kibana/management/sections/indices/_index_header.html';
uiModules
.get('apps/management')
.directive('kbnManagementIndexHeader', function (config) {
  return {
    restrict: 'E',
    template: indexHeaderTemplate,
    replace: true,
    scope: {
      indexPattern: '=',
      setDefault: '&',
      refreshFields: '&',
      delete: '&',
    },
    link: function ($scope, $el, attrs) {
      $scope.delete = attrs.delete ? $scope.delete : null;
      $scope.setDefault = attrs.setDefault ? $scope.setDefault : null;
      $scope.refreshFields = attrs.refreshFields ? $scope.refreshFields : null;
      config.bindToScope($scope, 'defaultIndex');
    }
  };
});
