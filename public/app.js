var _ = require('lodash');
var logoUrl = require('./logo.png');

require('angularSortableView');

require('./directives/chart_directive');
require('./directives/expression_directive');
require('./directives/scroll_class');
require('./directives/timelion_grid');
require('./directives/docs');
require('./main.less');

var timelionLogo = require('plugins/timelion/header.png');

require('ui/chrome')
.setBrand({
  'logo': 'url(' + timelionLogo + ') left no-repeat',
  'smallLogo': 'url(' + timelionLogo + ') left no-repeat'
}).setTabs([]);

var app = require('ui/modules').get('apps/timelion', ['angular-sortable-view']);

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

app.controller('timelion', function (
  $scope, $http, timefilter, AppState, courier, $route, $routeParams, kbnUrl, Notifier, config, $timeout, Private) {
  timefilter.enabled = true;
  var notify = new Notifier({
    location: 'Timelion'
  });

  var timezone = Private(require('plugins/timelion/services/timezone'))();
  var defaultExpression = '.es(*)';
  var savedSheet = $route.current.locals.savedSheet;
  var blankSheet = [defaultExpression];

    // config panel templates
  $scope.configTemplate = new ConfigTemplate({
    load: require('plugins/timelion/partials/load_sheet.html'),
    save: require('plugins/timelion/partials/save_sheet.html'),
    options: require('plugins/timelion/partials/sheet_options.html'),
    docs: '<timelion-docs></timelion-docs>'
  });

  if (config.get('timelion:showTutorial', true)) {
    $scope.configTemplate.toggle('docs');
  }

  $scope.state = new AppState(getStateDefaults());
  function getStateDefaults() {
    return {
      sheet: savedSheet.timelion_sheet,
      selected: 0,
      columns: savedSheet.timelion_columns,
      rows: savedSheet.timelion_rows,
      interval: savedSheet.timelion_interval,
      otherInterval: savedSheet.timelion_other_interval
    };
  }

  var init = function () {
    $scope.running = false;
    $scope.search();

    $scope.$listen($scope.state, 'fetch_with_changes', $scope.search);
    $scope.$listen(timefilter, 'fetch', $scope.search);

    $scope.opts = {
      save: save,
      savedSheet: savedSheet,
      state: $scope.state,
      search: $scope.search,
      dontShowHelp: function () {
        config.set('timelion:showTutorial', false);
        $scope.configTemplate.toggle('docs');
      }
    };
  };

  var refresher;
  $scope.$watchCollection('timefilter.refreshInterval', function (interval) {
    if (refresher) $timeout.cancel(refresher);
    if (interval.value > 0 && !interval.pause) {
      function startRefresh() {
        refresher = $timeout(function () {
          if (!$scope.running) $scope.search();
          startRefresh();
        }, interval.value);
      };
      startRefresh();
    }
  });

  $scope.$watch('state.interval', function (newInterval, oldInterval) {
    if (oldInterval === 'other') return;
    $scope.state.otherInterval = oldInterval;
  });

  $scope.drop = function (item, partFrom, partTo, indexFrom, indexTo) {
    $scope.state.selected = indexTo;
    _.move($scope.sheet, indexFrom, indexTo);
  };

  $scope.toggle = function (property) {
    $scope[property] = !$scope[property];
  };

  $scope.newSheet = function () {
    kbnUrl.change('/', {});
  };

  $scope.newCell = function () {
    $scope.state.sheet.push(defaultExpression);
    $scope.state.selected = $scope.state.sheet.length - 1;
    $scope.safeSearch();
  };

  $scope.removeCell = function (index) {
    _.pullAt($scope.state.sheet, index);
    $scope.safeSearch();
  };

  $scope.setActiveCell = function (cell) {
    $scope.state.selected = cell;
  };

  $scope.search = function () {
    $scope.state.save();
    $scope.running = true;

    $http.post('/timelion/run', {
      sheet: $scope.state.sheet,
      time: _.extend(timefilter.time, {
        interval: getInterval($scope.state),
        timezone: timezone
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
      $scope.sheet = [];
      $scope.running = false;

      var err = new Error(resp.message);
      err.stack = resp.stack;
      notify.error(err);

    });
  };

  function getInterval(state) {
    if (state.interval === 'other') {
      return state.otherInterval;
    }
    return state.interval;
  }

  $scope.safeSearch = _.debounce($scope.search, 500);

  function save() {
    savedSheet.id = savedSheet.title;
    savedSheet.timelion_sheet = $scope.state.sheet;
    savedSheet.timelion_interval = $scope.state.interval;
    savedSheet.timelion_other_interval = $scope.state.otherInterval;
    savedSheet.timelion_columns = $scope.state.columns;
    savedSheet.timelion_rows = $scope.state.rows;
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
