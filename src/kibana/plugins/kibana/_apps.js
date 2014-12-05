define(function (require) {
  return function KbnControllerApps(Private, $rootScope, $scope, $location, globalState, sessionStorage) {
    var _ = require('lodash');

    function appKey(app) {
      return 'lastPath:' + app.id;
    }

    function getLastPath(app) {
      app.lastPath = sessionStorage.get(appKey(app)) || '/' + app.id;
      return app.lastPath;
    }

    function getShow(app) {
      app.show = app.order >= 0 ? true : false;
    }

    function setLastPath(app, path) {
      app.lastPath = path;
      return sessionStorage.set(appKey(app), path);
    }

    $scope.apps = Private(require('registry/apps'));
    // initialize each apps lastPath (fetch it from storage)
    $scope.apps.forEach(getLastPath);
    $scope.apps.forEach(getShow);


    function onRouteChange() {
      var route = $location.path().split(/\//);
      var app = $rootScope.activeApp = _.find($scope.apps, { id: route[1] });

      if (!app) return;

      // Record the last URL w/ state of the app, use for tab.
      setLastPath(app, globalState.removeFromUrl($location.url()));
    }

    $rootScope.$on('$routeChangeSuccess', onRouteChange);
    $rootScope.$on('$routeUpdate', onRouteChange);
  };
});