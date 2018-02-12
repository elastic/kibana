
export function filterParamsController($http, $scope) {
  $scope.$on('value_event', function (event, data) {
    $scope.params = { values: data };
  });
}
