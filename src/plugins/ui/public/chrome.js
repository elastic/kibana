define(function (require) {
  require('angular-bootstrap');
  require('components/private');
  require('components/config/config');
  require('components/courier/courier');
  require('components/filter_bar/filter_bar');
  require('components/notify/notify');
  require('components/persisted_log/persisted_log');
  require('components/state_management/app_state');
  require('components/storage/storage');
  require('components/url/url');
  require('components/doc_title/doc_title');
  require('components/tooltip/tooltip');
  require('components/style_compile/style_compile');
  require('components/watch_multi');
  require('components/bind');
  require('components/listen');
  require('components/fancy_forms/fancy_forms');
  require('components/stringify/register');

  require('modules')
  .get('kibana', ['ui.bootstrap'])
  .config(function ($tooltipProvider, kbnChromeProvider) {
    $tooltipProvider.setTriggers({ 'mouseenter': 'mouseleave click' });
  });

  function Chrome() {
    var showCacheMessage = location.href.indexOf('?embed') < 0 && location.href.indexOf('&embed') < 0;
    if (!showCacheMessage) document.getElementById('cache-message').style.display = 'none';
  }

  .controller('KibanaChromeController', function (Private, $rootScope, $injector, Promise, config, kbnSetup) {
    return {
      template: require('text!plugins/kibana/kibana.html'),
      controllerAs: 'kibana',
      controller: function ($scope) {
        var _ = require('lodash');
        var notify = new Notifier({ location: 'Kibana' });

        // run init functions before loading the mixins, so that we can ensure that
        // the environment is ready for them to get and use their dependencies
        self.ready = Promise.all([ kbnSetup(), config.init() ])
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
