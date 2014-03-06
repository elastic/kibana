define(function (require) {
  var _ = require('lodash');
  var $ = require('jquery');
  var moment = require('moment');

  require('services/config');
  require('services/courier');
  require('directives/view');

  require('modules')
    .get('kibana/controllers')
    .controller('kibana', function ($scope, courier, config, configFile) {
      $scope.apps = configFile.apps;

      $scope.$on('$locationChangeSuccess', function (event, uri) {
        if (!uri) return;
        var route = uri.split('#/').slice(1);
        $scope.activeApp = route ? route[0] : null;
      });

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

      $scope.$on('application.load', function () {
        courier.start();
      });
    });
});