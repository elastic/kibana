define(function (require) {
  require('modules')
  .get('kibana')
  .config(function ($tooltipProvider) {
    $tooltipProvider.setTriggers({ 'mouseenter': 'mouseleave click' });
  })
  .directive('kbnChrome', function () {
    return {
      template: require('text!plugins/kibana/kibana.html'),
      controllerAs: 'kibana',
      controller: function ($scope) {
        var _ = require('lodash');
        var self = this;
        var notify = new Notifier({ location: 'Kibana' });

        // run init functions before loading the mixins, so that we can ensure that
        // the environment is ready for them to get and use their dependencies
        self.ready = Promise.all([ config.init() ])
        .then(function () {
          // load some "mixins"
          var mixinLocals = { $scope: $scope, notify: notify };

          $injector.invoke(require('plugins/kibana/_init'), self, mixinLocals);
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

          $scope.apps.forEach(getShow);


          function onRouteChange() {
            var route = $location.path().split(/\//);
            $scope.apps.forEach(function (app) {
              if (app.active = app.id === route[1]) {
                $rootScope.activeApp = app;
              }
            });

            if (!$rootScope.activeApp || $scope.appEmbedded) return;

            // Record the last URL w/ state of the app, use for tab.
            setLastPath($rootScope.activeApp, globalState.removeFromUrl($location.url()));
          }

          $rootScope.$on('$routeChangeSuccess', onRouteChange);
          $rootScope.$on('$routeUpdate', onRouteChange);
          $injector.invoke(require('plugins/kibana/_timepicker'), self, mixinLocals);

          $scope.setupComplete = true;
        });
      }
    };
  });
});
