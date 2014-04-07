define(function (require) {
  var _ = require('lodash');
  var $ = require('jquery');
  var moment = require('moment');
  var nextTick = require('utils/next_tick');

  require('config/config');
  require('courier/courier');
  require('notify/notify');
  require('directives/info');
  require('angular-bootstrap');

  require('modules')
    .get('kibana/controllers', ['ui.bootstrap'])
    .config(function ($tooltipProvider) {
      $tooltipProvider.options({
        placement: 'bottom',
        animation: true,
        popupDelay: 150,
        appendToBody: false
      });
    })
    .controller('kibana', function ($rootScope, $scope, courier, config, configFile, createNotifier, $timeout, $location) {
      var notify = createNotifier();
      $scope.apps = configFile.apps;

      $rootScope.rootDataSource = courier.createSource('search')
        .index('logstash-*');

      function updateAppData() {
        var route = $location.path().split(/\//);
        var app = _.find($scope.apps, {id: route[1]});

        // Record the last URL w/ state of the app, use for tab.
        app.lastPath = $location.url().substring(1);

        // Set class of container to application-<whateverApp>
        $scope.activeApp = route ? route[1] : null;
      }

      $scope.$on('$routeChangeSuccess', updateAppData);
      $scope.$on('$routeUpdate', updateAppData);

      // this is the only way to handle uncaught route.resolve errors
      $scope.$on('$routeChangeError', notify.fatal);

      $scope.$on('application.load', function () {
        courier.start();
      });

      config.init()
      .then(function () {
        $scope.opts = {
          activeFetchInterval: void 0,
          fetchIntervals: [
            { display: 'none', val: null},
            { display: '5s', val: 5000 },
            { display: '10s', val: 10000 },
            { display: '30s', val: 30000 },
            { display: '1m', val: 60000 },
            { display: '5m', val: 300000 },
            { display: '15m', val: 900000 },
            { display: '30m', val: 1.8e+6 },
            { display: '1h', val: 3.6e+6 },
            { display: '2h', val: 7.2e+6 },
            { display: '1d', val: 8.64e+7 }
          ]
        };

        $scope.configure = function () {
          $scope.configureTemplateUrl = require('text!../partials/global_config.html');
        };

        // expose the notification services list of notifs on the $scope so that the
        // notification directive can show them on the screen
        $scope.notifList = notify._notifs;
        // provide alternate methods for setting timeouts, which will properly trigger digest cycles
        notify._setTimerFns($timeout, $timeout.cancel);

        /**
         * Persist current settings
         * @return {[type]} [description]
         */
        $scope.saveOpts = function () {
          config.set('refreshInterval', $scope.opts.activeFetchInterval.val);
        };

        $scope.setActiveFetchInterval = function (val) {
          var option = _.find($scope.opts.fetchIntervals, { val: val });
          if (option) {
            $scope.opts.activeFetchInterval = option;
            return;
          }

          // create a custom option for this value
          option = { display: moment.duration(val).humanize(), val: val };
          $scope.opts.fetchIntervals.unshift(option);
          $scope.opts.activeFetchInterval = option;
        };

        $scope.activeFetchIntervalChanged = function (option, prev) {
          var opts = $scope.opts;

          if (option && typeof option !== 'object') {
            $scope.setActiveFetchInterval(option);
            return;
          }

          courier.fetchInterval(option.val);
        };

        $scope.setActiveFetchInterval(config.get('fetchInterval', null));
        $scope.$on('change:config.refreshInterval', $scope.setActiveFetchInterval);
        $scope.$watch('opts.activeFetchInterval', $scope.activeFetchIntervalChanged);
      });
    });
});
