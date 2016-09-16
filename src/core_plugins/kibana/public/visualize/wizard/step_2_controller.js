export default module => {
  module.controller('VisualizeWizardStep2', function ($route, $scope, timefilter, kbnUrl) {
    const type = $route.current.params.type;

    $scope.step2WithSearchUrl = function (hit) {
      return kbnUrl.eval('#/visualize/create?&type={{type}}&savedSearchId={{id}}', {type: type, id: hit.id});
    };

    timefilter.enabled = false;

    $scope.indexPattern = {
      selection: null,
      list: $route.current.locals.indexPatternIds
    };

    $scope.makeUrl = function (pattern) {
      if (!pattern) return;
      return `#/visualize/create?type=${type}&indexPattern=${pattern}`;
    };
  });
};
