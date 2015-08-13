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

require('plugins/timelion/services/saved_sheets');
require('plugins/timelion/services/_saved_sheet');

require('ui/saved_objects/saved_object_registry').register(require('plugins/timelion/services/saved_sheet_register'));

// TODO: Expose an api for dismissing notifications
var unsafeNotifications = require('ui/notify')._notifs;
var ConfigTemplate = require('ui/ConfigTemplate');

require('ui/routes')
  .when('/:id?', {
    template: require('plugins/timelion/index.html'),
    reloadOnSearch: false,
    resolve: {
      savedSheet: function (courier, savedSheets, $route) {
        return savedSheets.get($route.current.params.id)
        .catch(courier.redirectWhenMissing({
          'search': '/'
        }));
      }
    }
  });

app.controller('timelion', function ($scope, $http, timefilter, AppState, courier, $route, $routeParams, kbnUrl, Notifier) {
  timefilter.enabled = true;
  var notify = new Notifier({
    location: 'Timelion'
  });

  var savedSheet = $route.current.locals.savedSheet;
  var blankSheet = ['`*`'];

    // config panel templates
  $scope.configTemplate = new ConfigTemplate({
    load: require('plugins/timelion/partials/load_sheet.html'),
    save: require('plugins/timelion/partials/save_sheet.html')
  });

  $scope.state = new AppState(getStateDefaults());
  function getStateDefaults() {
    return {
      sheet: savedSheet.timelion_sheet || blankSheet,
      selected: 0,
      interval: savedSheet.timelion_interval || '1d'
    };
  }



  var init = function () {
    $scope.running = false;
    $scope.search();

    $scope.$listen($scope.state, 'fetch_with_changes', $scope.search);
    $scope.$listen(timefilter, 'fetch', $scope.search);

    $scope.opts = {
      save: save,
      savedSheet: savedSheet
    };
  };

  $scope.toggleButtons = function () {
    $scope.showButtons = !$scope.showButtons;
  };

  $scope.newSheet = function () {
    $scope.state.sheet = [];
    $scope.newCell();
    $scope.search();
  };

  $scope.newCell = function () {
    $scope.state.sheet.push('`*`');
    $scope.state.selected = $scope.state.sheet.length - 1;
    $scope.search();
  };

  $scope.removeCell = function (index) {
    _.pullAt($scope.state.sheet, index);
    $scope.search();
  };

  $scope.setActiveCell = function (cell) {
    $scope.state.selected = cell;
  };

  $scope.search = function () {
    $scope.state.save();
    $scope.running = true;

    $http.post('/timelion/sheet', {
      sheet: $scope.state.sheet,
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

  function save() {
    savedSheet.id = savedSheet.title;
    savedSheet.timelion_sheet = $scope.state.sheet;
    savedSheet.timelion_interval = $scope.state.interval;

    savedSheet.save().then(function (id) {
      $scope.configTemplate.close('save');
      if (id) {
        notify.info('Saved sheet as "' + savedSheet.title + '"');
        if (savedSheet.id !== $routeParams.id) {
          kbnUrl.change('/{{id}}', {id: savedSheet.id});
        }
      }
    });
  };

  function dismissNotifications() {
    unsafeNotifications.splice(0, unsafeNotifications.length);
  }

  init();
});
