export default (module, RegistryVisTypesProvider) => {
  module.controller('VisualizeWizardStep1', function ($scope, timefilter, Private) {
    timefilter.enabled = false;

    $scope.visTypes = Private(RegistryVisTypesProvider);
    $scope.visTypeUrl = function (visType) {
      if (!visType.requiresSearch) return '#/visualize/create?type=' + encodeURIComponent(visType.name);
      else return '#/visualize/step/2?type=' + encodeURIComponent(visType.name);
    };
  });
};
