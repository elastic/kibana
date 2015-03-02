define(function (require) {
  return function KibanaControllerInit($rootScope, $scope, $location, courier, $http, globalState, notify) {
    // expose some globals
    $rootScope.globalState = globalState;

    // and some local values
    $scope.appEmbedded = $location.search().embed || false;
    $scope.httpActive = $http.pendingRequests;
    $scope.notifList = notify._notifs;

    // wait for the application to finish loading
    $scope.$on('application.load', function () {
      courier.start();
    });
  };
});
