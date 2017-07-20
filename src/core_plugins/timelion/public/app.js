import _ from 'lodash';
import moment from 'moment-timezone';

import { DocTitleProvider } from 'ui/doc_title';
import { SavedObjectRegistryProvider } from 'ui/saved_objects/saved_object_registry';
import { notify } from 'ui/notify';

require('plugins/timelion/directives/cells/cells');
require('plugins/timelion/directives/fullscreen/fullscreen');
require('plugins/timelion/directives/interval/interval');
require('plugins/timelion/directives/expression_directive');
require('plugins/timelion/directives/fixed_element');
require('plugins/timelion/directives/docs');

require('plugins/timelion/app.less');

document.title = 'Timelion - Kibana';

require('ui/chrome');

const app = require('ui/modules').get('apps/timelion', []);

require('plugins/timelion/services/saved_sheets');
require('plugins/timelion/services/_saved_sheet');

require('plugins/kibana/visualize/saved_visualizations/saved_visualizations');
require('plugins/kibana/discover/saved_searches/saved_searches');
require('./vis');

SavedObjectRegistryProvider.register(require('plugins/timelion/services/saved_sheet_register'));

const unsafeNotifications = notify._notifs;

require('ui/routes').enable();

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
    $scope, $http, timefilter, AppState, courier, $route, $routeParams,
    kbnUrl, Notifier, config, $timeout, Private, savedVisualizations, confirmModal) {

  // Keeping this at app scope allows us to keep the current page when the user
  // switches to say, the timepicker.
  $scope.page = config.get('timelion:showTutorial', true) ? 1 : 0;
  $scope.setPage = (page) => $scope.page = page;

  // TODO: For some reason the Kibana core doesn't correctly do this for all apps.
  moment.tz.setDefault(config.get('dateFormat:tz'));

  timefilter.enabled = true;
  const notify = new Notifier({
    location: 'Timelion'
  });

  const timezone = Private(require('plugins/timelion/services/timezone'))();
  const docTitle = Private(DocTitleProvider);

  const defaultExpression = '.es(*)';
  const savedSheet = $route.current.locals.savedSheet;

  $scope.topNavMenu = [{
    key: 'new',
    description: 'New Sheet',
    run: function () { kbnUrl.change('/'); },
    testId: 'timelionNewButton',
  }, {
    key: 'add',
    description: 'Add a chart',
    run: function () { $scope.newCell(); },
    testId: 'timelionAddChartButton',
  }, {
    key: 'save',
    description: 'Save Sheet',
    template: require('plugins/timelion/partials/save_sheet.html'),
    testId: 'timelionSaveButton',
  }, {
    key: 'delete',
    description: 'Delete current sheet',
    disableButton: function () {
      return !savedSheet.id;
    },
    run: function () {
      const title = savedSheet.title;
      function doDelete() {
        savedSheet.delete().then(() => {
          notify.info('Deleted ' + title);
          kbnUrl.change('/');
        }).catch(notify.fatal);
      }

      const confirmModalOptions = {
        onConfirm: doDelete,
        confirmButtonText: 'Delete sheet'
      };
      confirmModal(`Are you sure you want to delete the sheet ${title}?`, confirmModalOptions);
    },
    testId: 'timelionDeleteButton',
  }, {
    key: 'open',
    description: 'Open Sheet',
    template: require('plugins/timelion/partials/load_sheet.html'),
    testId: 'timelionOpenButton',
  }, {
    key: 'options',
    description: 'Options',
    template: require('plugins/timelion/partials/sheet_options.html'),
    testId: 'timelionOptionsButton',
  }, {
    key: 'docs',
    description: 'Documentation',
    template: '<timelion-docs></timelion-docs>',
    testId: 'timelionDocsButton',
  }];


  $timeout(function () {
    if (config.get('timelion:showTutorial', true)) {
      $scope.kbnTopNav.open('docs');
    }
  }, 0);

  $scope.transient = {};
  $scope.state = new AppState(getStateDefaults());
  function getStateDefaults() {
    return {
      sheet: savedSheet.timelion_sheet,
      selected: 0,
      columns: savedSheet.timelion_columns,
      rows: savedSheet.timelion_rows,
      interval: savedSheet.timelion_interval
    };
  }

  const init = function () {
    $scope.running = false;
    $scope.search();

    $scope.$listen($scope.state, 'fetch_with_changes', $scope.search);
    $scope.$listen(timefilter, 'fetch', $scope.search);

    $scope.opts = {
      saveExpression: saveExpression,
      saveSheet: saveSheet,
      savedSheet: savedSheet,
      state: $scope.state,
      search: $scope.search,
      dontShowHelp: function () {
        config.set('timelion:showTutorial', false);
        $scope.setPage(0);
        $scope.kbnTopNav.close('docs');
      }
    };
  };

  let refresher;
  $scope.$watchCollection('timefilter.refreshInterval', function (interval) {
    if (refresher) $timeout.cancel(refresher);
    if (interval.value > 0 && !interval.pause) {
      function startRefresh() {
        refresher = $timeout(function () {
          if (!$scope.running) $scope.search();
          startRefresh();
        }, interval.value);
      }
      startRefresh();
    }
  });

  $scope.$watch(function () { return savedSheet.lastSavedTitle; }, function (newTitle) {
    docTitle.change(savedSheet.id ? newTitle : undefined);
  });

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

  $scope.setActiveCell = function (cell) {
    $scope.state.selected = cell;
  };

  $scope.search = function () {
    $scope.state.save();
    $scope.running = true;

    $http.post('../api/timelion/run', {
      sheet: $scope.state.sheet,
      time: _.extend(timefilter.time, {
        interval: $scope.state.interval,
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

      const err = new Error(resp.message);
      err.stack = resp.stack;
      notify.error(err);

    });
  };

  $scope.safeSearch = _.debounce($scope.search, 500);

  function saveSheet() {
    savedSheet.timelion_sheet = $scope.state.sheet;
    savedSheet.timelion_interval = $scope.state.interval;
    savedSheet.timelion_columns = $scope.state.columns;
    savedSheet.timelion_rows = $scope.state.rows;
    savedSheet.save().then(function (id) {
      if (id) {
        notify.info('Saved sheet as "' + savedSheet.title + '"');
        if (savedSheet.id !== $routeParams.id) {
          kbnUrl.change('/{{id}}', { id: savedSheet.id });
        }
      }
    });
  }

  function saveExpression(title) {
    savedVisualizations.get({ type: 'timelion' }).then(function (savedExpression) {
      savedExpression.visState.params = {
        expression: $scope.state.sheet[$scope.state.selected],
        interval: $scope.state.interval
      };
      savedExpression.title = title;
      savedExpression.visState.title = title;
      savedExpression.save().then(function (id) {
        if (id) notify.info('Saved expression as "' + savedExpression.title + '"');
      });
    });
  }

  function dismissNotifications() {
    unsafeNotifications.splice(0, unsafeNotifications.length);
  }

  init();
});
