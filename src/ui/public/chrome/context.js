define(function (require) {
  require('plugins/appSwitcher/appSwitcher.less');

  var _ = require('lodash');
  var ConfigTemplate = require('ui/ConfigTemplate');

  require('ui/modules')
  .get('kibana')
  .directive('chromeContext', function (timefilter, globalState, $http) {

    var listenForUpdates = _.once(function ($scope) {
      $scope.$listen(timefilter, 'update', function (newVal, oldVal) {
        globalState.time = _.clone(timefilter.time);
        globalState.refreshInterval = _.clone(timefilter.refreshInterval);
        globalState.save();
      });
    });

    return {
      link: function ($scope) {
        listenForUpdates($scope);

        // chrome is responsible for timepicker ui and state transfer...
        $scope.timefilter = timefilter;
        $scope.pickerTemplate = new ConfigTemplate({
          filter: require('ui/chrome/config/filter.html'),
          interval: require('ui/chrome/config/interval.html')
        });


        $scope.switcher = {loading: true};
        $http.get('/api/apps')
        .then(function (resp) {
          $scope.switcher.loading = false;
          $scope.switcher.apps = resp.data;
        });
        $scope.appTemplate = new ConfigTemplate({
          switcher: require('plugins/appSwitcher/appSwitcher.html')
        });

        $scope.toggleRefresh = function () {
          timefilter.refreshInterval.pause = !timefilter.refreshInterval.pause;
        };
      }
    };
  });

});
