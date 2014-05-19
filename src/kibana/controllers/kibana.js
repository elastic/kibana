define(function (require) {
  var _ = require('lodash');
  var $ = require('jquery');
  var moment = require('moment');
  var nextTick = require('utils/next_tick');
  var qs = require('utils/query_string');
  var rison = require('utils/rison');

  require('config/config');
  require('courier/courier');
  require('notify/notify');
  require('directives/info');
  require('angular-bootstrap');
  require('utils/private');

  var module = require('modules').get('kibana/controllers', ['ui.bootstrap']);

  module.config(function ($tooltipProvider) {
    $tooltipProvider.options({
      placement: 'bottom',
      animation: true,
      popupDelay: 150,
      appendToBody: false
    });
  });

  module.controller('kibana', function ($rootScope, $scope, Notifier, $injector, $q, $http, config, kbnSetup) {
    var notify = new Notifier();

    $scope.httpActive = $http.pendingRequests;

    // this is the only way to handle uncaught route.resolve errors
    $rootScope.$on('$routeChangeError', function (event, next, prev, err) {
      notify.fatal(err);
    });

    $q.all([
      kbnSetup(),
      config.init()
    ]).then(function () {
      $injector.invoke(function ($rootScope, courier, config, configFile, $timeout, $location, timefilter, globalState) {

        // get/set last path for an app
        var lastPathFor = function (app, path) {
          var key = 'lastPath:' + app.id;
          if (path === void 0) {
            app.lastPath = localStorage.getItem(key) || '/' + app.id;
            return app.lastPath;
          } else {
            app.lastPath = path;
            return localStorage.setItem(key, path);
          }
        };

        $scope.apps = configFile.apps;
        // initialize each apps lastPath (fetch it from localStorage)
        $scope.apps.forEach(function (app) { lastPathFor(app); });

        function onRouteChange() {
          var route = $location.path().split(/\//);
          var app = _.find($scope.apps, {id: route[1]});

          // Record the last URL w/ state of the app, use for tab.
          lastPathFor(app, $location.url());

          // Set class of container to application-<appId>
          $scope.activeApp = route ? route[1] : null;
        }

        $rootScope.$on('$routeChangeSuccess', onRouteChange);
        $rootScope.$on('$routeUpdate', onRouteChange);

        var writeGlobalStateToLastPaths = function () {
          var currentUrl = $location.url();
          var _g = rison.encode(globalState);

          $scope.apps.forEach(function (app) {
            var url = lastPathFor(app);
            if (!url || url === currentUrl) return;

            lastPathFor(app, qs.replaceParamInUrl(url, '_g', _g));
          });
        };

        // watch the timefilter for changes, and write to globalState when it changes
        $scope.$watchCollection('opts.timefilter.time', function writeToGlobalState() {
          globalState.time = _.clone(timefilter.time);
          globalState.commit();

          writeGlobalStateToLastPaths();
        });

        $scope.$on('application.load', function () {
          courier.start();
        });

        $scope.opts = {
          timefilter: timefilter,
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

        $scope.toggleTimepicker = function () {
          var timepickerHtml = '<kbn-timepicker from="opts.timefilter.time.from"' +
            ' to="opts.timefilter.time.to" mode="opts.timefilter.time.mode"></kbn-timepicker>';
          // Close if already open
          if ($scope.globalConfigTemplate === timepickerHtml) {
            delete $scope.globalConfigTemplate;
          } else {
            $scope.globalConfigTemplate = timepickerHtml;
          }
        };

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
});
