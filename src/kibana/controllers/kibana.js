define(function (require) {
  var _ = require('lodash');
  var $ = require('jquery');
  var moment = require('moment');

  require('services/config');
  require('services/courier');
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
      var notify = createNotifier({
        location: 'Kibana Controller'
      });
      $scope.apps = configFile.apps;


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

      $rootScope.rootDataSource = courier.createSource('search')
        .index('logstash-*');

      $scope.opts = {
        activeFetchInterval: void 0,
        fetchIntervals: [
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

      (function TODO_REMOVE() {
        // stuff for testing notifications
        $scope.levels = [
          { name: 'info', icon: 'info' },
          { name: 'warning', icon: 'info-circle' },
          { name: 'error', icon: 'warning' },
          { name: 'fatal', icon: 'fire' },
        ];
        $scope.notifTest = function (type) {
          var arg = 'Something happened, just thought you should know.';
          var cb;
          if (type === 'fatal' || type === 'error') {
            arg = new Error('Ah fuck');
          }
          if (type === 'error') {
            cb = function (resp) {
              if (resp !== 'report') return;
              $timeout(function () {
                notify.info('Report sent, thank you for your help.');
              }, 750);
            };
          }
          notify[type](arg, cb);
        };
      }());

      /**
       * Persist current settings
       * @return {[type]} [description]
       */
      $scope.saveOpts = function () {
        config.set('refreshInterval', $scope.opts.activeFetchInterval.val);
      };

      $scope.setFetchInterval = function (option) {
        var opts = $scope.opts;

        if (option && typeof option !== 'object') {
          var val = option;
          option = _.find($scope.opts.fetchIntervals, { val: val });
          if (!option) {
            // create a custom option for this value
            option = { display: moment.duration(val).humanize(), val: val };
            $scope.opts.unshift(option);
          }
        }

        if (option === opts.activeFetchInterval) return;
        opts.activeFetchInterval = option;

        if (option) {
          courier.fetchInterval(option.val);
        } else {
          courier.stop();
        }
      };
      config.$watch('refreshInterval', $scope.setFetchInterval);
      $scope.$watch('opts.activeFetchInterval', $scope.setFetchInterval);


      // setup the courier
      courier.on('error', function (err) {
        $scope[$scope.$$phase ? '$eval' : '$apply'](function () {
          notify.error(err);
        });
      });
      $scope.$on('application.load', function () {
        courier.start();
      });
    });
});
