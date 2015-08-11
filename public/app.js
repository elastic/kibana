var _ = require('lodash');

var logoUrl = require('./logo.png');

require('./chart_directive');
require('./main.less');

require('ui/chrome')
.setTabDefaults({
  activeIndicatorColor: '#656a76'
})
.setTabs([
  {
    id: '',
    title: 'TimeLion'
  }
]);

var app = require('ui/modules').get('apps/timelion', []);

// TODO: Expose an api for dismissing notifications
var unsafeNotifications = require('ui/notify')._notifs;

require('ui/routes')
  .when('/', {
    template: require('plugins/timelion/index.html'),
    reloadOnSearch: false,
  });

app.controller('timelion', function ($scope, $http, timefilter, AppState, courier, $rootScope, Notifier) {

  $scope.toggleButtons = function () {
    $scope.showButtons = !$scope.showButtons;
  };

  timefilter.enabled = true;

  var blankSheet = ['es()'];

  var notify = new Notifier({
    location: 'Timelion'
  });

  $rootScope.$on('courier:searchRefresh', function () {
    console.log('search');
  });

  $scope.state = new AppState(getStateDefaults());
  function getStateDefaults() {
    return {
      expressions: blankSheet,
      selected: 0,
      interval: '1d'
    };
  }

  var init = function () {
    $scope.running = false;
    $scope.search();

    $scope.$listen($scope.state, 'fetch_with_changes', $scope.search);
    $scope.$listen(timefilter, 'fetch', $scope.search);
  };


  $scope.newSheet = function () {
    $scope.state.expressions = [];
    $scope.newCell();
    $scope.search();
  };

  $scope.newCell = function () {
    $scope.state.expressions.push('es()');
    $scope.state.selected = $scope.state.expressions.length - 1;
    $scope.search();
  };

  $scope.removeCell = function (index) {
    _.pullAt($scope.state.expressions, index);
    $scope.search();
  };

  $scope.setActiveCell = function (cell) {
    $scope.state.selected = cell;
  };

  $scope.search = function () {
    $scope.state.save();
    $scope.running = true;

    $http.post('/timelion/sheet', {
      sheet:$scope.state.expressions,
      time: _.extend(timefilter.time, {
        interval: $scope.state.interval
      }),
    })
    // data, status, headers, config
    .success(function (resp) {
      dismissNotifications();
      $scope.stats = resp.stats;
      $scope.sheet = resp.sheet;
      _.each(resp.sheet, function (cell) {
        if (cell.exception) {
          $scope.state.selected = cell.plot;
        }
      });
      $scope.running = false;
    })
    .error(function (resp) {
      notify.error(resp.error);
      $scope.sheet = [];
      $scope.running = false;
    });
  };

  function dismissNotifications() {
    unsafeNotifications.splice(0, unsafeNotifications.length);
  }

  init();
});
