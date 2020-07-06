/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import _ from 'lodash';
// required for `ngSanitize` angular module
import 'angular-sanitize';

import { i18n } from '@kbn/i18n';

import routes from 'ui/routes';
import { capabilities } from 'ui/capabilities';
import { docTitle } from 'ui/doc_title';
import { fatalError, toastNotifications } from 'ui/notify';
import { timefilter } from 'ui/timefilter';
import { npStart } from 'ui/new_platform';
import { getSavedSheetBreadcrumbs, getCreateBreadcrumbs } from './breadcrumbs';
import { getTimezone } from '../../../../plugins/vis_type_timelion/public';

import 'uiExports/savedObjectTypes';

require('ui/i18n');
require('ui/autoload/all');

// TODO: remove ui imports completely (move to plugins)
import 'ui/directives/input_focus';
import './directives/saved_object_finder';
import 'ui/directives/listen';
import './directives/saved_object_save_as_checkbox';
import './services/saved_sheet_register';

import rootTemplate from 'plugins/timelion/index.html';

import { loadKbnTopNavDirectives } from '../../../../plugins/kibana_legacy/public';
loadKbnTopNavDirectives(npStart.plugins.navigation.ui);

require('plugins/timelion/directives/cells/cells');
require('plugins/timelion/directives/fixed_element');
require('plugins/timelion/directives/fullscreen/fullscreen');
require('plugins/timelion/directives/timelion_expression_input');
require('plugins/timelion/directives/timelion_help/timelion_help');
require('plugins/timelion/directives/timelion_interval/timelion_interval');
require('plugins/timelion/directives/timelion_save_sheet');
require('plugins/timelion/directives/timelion_load_sheet');
require('plugins/timelion/directives/timelion_options_sheet');

document.title = 'Timelion - Kibana';

const app = require('ui/modules').get('apps/timelion', ['i18n', 'ngSanitize']);

routes.enable();

routes.when('/:id?', {
  template: rootTemplate,
  reloadOnSearch: false,
  k7Breadcrumbs: ($injector, $route) =>
    $injector.invoke($route.current.params.id ? getSavedSheetBreadcrumbs : getCreateBreadcrumbs),
  badge: (uiCapabilities) => {
    if (uiCapabilities.timelion.save) {
      return undefined;
    }

    return {
      text: i18n.translate('timelion.badge.readOnly.text', {
        defaultMessage: 'Read only',
      }),
      tooltip: i18n.translate('timelion.badge.readOnly.tooltip', {
        defaultMessage: 'Unable to save Timelion sheets',
      }),
      iconType: 'glasses',
    };
  },
  resolve: {
    savedSheet: function (redirectWhenMissing, savedSheets, $route) {
      return savedSheets
        .get($route.current.params.id)
        .then((savedSheet) => {
          if ($route.current.params.id) {
            npStart.core.chrome.recentlyAccessed.add(
              savedSheet.getFullPath(),
              savedSheet.title,
              savedSheet.id
            );
          }
          return savedSheet;
        })
        .catch(
          redirectWhenMissing({
            search: '/',
          })
        );
    },
  },
});

const location = 'Timelion';

app.controller('timelion', function (
  $http,
  $route,
  $routeParams,
  $scope,
  $timeout,
  AppState,
  config,
  kbnUrl
) {
  // Keeping this at app scope allows us to keep the current page when the user
  // switches to say, the timepicker.
  $scope.page = config.get('timelion:showTutorial', true) ? 1 : 0;
  $scope.setPage = (page) => ($scope.page = page);

  timefilter.enableAutoRefreshSelector();
  timefilter.enableTimeRangeSelector();

  const savedVisualizations = npStart.plugins.visualizations.savedVisualizationsLoader;
  const timezone = getTimezone(config);

  const defaultExpression = '.es(*)';
  const savedSheet = $route.current.locals.savedSheet;

  $scope.topNavMenu = getTopNavMenu();

  $timeout(function () {
    if (config.get('timelion:showTutorial', true)) {
      $scope.toggleMenu('showHelp');
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
      interval: savedSheet.timelion_interval,
    };
  }

  function getTopNavMenu() {
    const newSheetAction = {
      id: 'new',
      label: i18n.translate('timelion.topNavMenu.newSheetButtonLabel', {
        defaultMessage: 'New',
      }),
      description: i18n.translate('timelion.topNavMenu.newSheetButtonAriaLabel', {
        defaultMessage: 'New Sheet',
      }),
      run: function () {
        kbnUrl.change('/');
      },
      testId: 'timelionNewButton',
    };

    const addSheetAction = {
      id: 'add',
      label: i18n.translate('timelion.topNavMenu.addChartButtonLabel', {
        defaultMessage: 'Add',
      }),
      description: i18n.translate('timelion.topNavMenu.addChartButtonAriaLabel', {
        defaultMessage: 'Add a chart',
      }),
      run: function () {
        $scope.$evalAsync(() => $scope.newCell());
      },
      testId: 'timelionAddChartButton',
    };

    const saveSheetAction = {
      id: 'save',
      label: i18n.translate('timelion.topNavMenu.saveSheetButtonLabel', {
        defaultMessage: 'Save',
      }),
      description: i18n.translate('timelion.topNavMenu.saveSheetButtonAriaLabel', {
        defaultMessage: 'Save Sheet',
      }),
      run: () => {
        $scope.$evalAsync(() => $scope.toggleMenu('showSave'));
      },
      testId: 'timelionSaveButton',
    };

    const deleteSheetAction = {
      id: 'delete',
      label: i18n.translate('timelion.topNavMenu.deleteSheetButtonLabel', {
        defaultMessage: 'Delete',
      }),
      description: i18n.translate('timelion.topNavMenu.deleteSheetButtonAriaLabel', {
        defaultMessage: 'Delete current sheet',
      }),
      disableButton: function () {
        return !savedSheet.id;
      },
      run: function () {
        const title = savedSheet.title;
        function doDelete() {
          savedSheet
            .delete()
            .then(() => {
              toastNotifications.addSuccess(
                i18n.translate('timelion.topNavMenu.delete.modal.successNotificationText', {
                  defaultMessage: `Deleted '{title}'`,
                  values: { title },
                })
              );
              kbnUrl.change('/');
            })
            .catch((error) => fatalError(error, location));
        }

        const confirmModalOptions = {
          confirmButtonText: i18n.translate('timelion.topNavMenu.delete.modal.confirmButtonLabel', {
            defaultMessage: 'Delete',
          }),
          title: i18n.translate('timelion.topNavMenu.delete.modalTitle', {
            defaultMessage: `Delete Timelion sheet '{title}'?`,
            values: { title },
          }),
        };

        $scope.$evalAsync(() => {
          npStart.core.overlays
            .openConfirm(
              i18n.translate('timelion.topNavMenu.delete.modal.warningText', {
                defaultMessage: `You can't recover deleted sheets.`,
              }),
              confirmModalOptions
            )
            .then((isConfirmed) => {
              if (isConfirmed) {
                doDelete();
              }
            });
        });
      },
      testId: 'timelionDeleteButton',
    };

    const openSheetAction = {
      id: 'open',
      label: i18n.translate('timelion.topNavMenu.openSheetButtonLabel', {
        defaultMessage: 'Open',
      }),
      description: i18n.translate('timelion.topNavMenu.openSheetButtonAriaLabel', {
        defaultMessage: 'Open Sheet',
      }),
      run: () => {
        $scope.$evalAsync(() => $scope.toggleMenu('showLoad'));
      },
      testId: 'timelionOpenButton',
    };

    const optionsAction = {
      id: 'options',
      label: i18n.translate('timelion.topNavMenu.optionsButtonLabel', {
        defaultMessage: 'Options',
      }),
      description: i18n.translate('timelion.topNavMenu.optionsButtonAriaLabel', {
        defaultMessage: 'Options',
      }),
      run: () => {
        $scope.$evalAsync(() => $scope.toggleMenu('showOptions'));
      },
      testId: 'timelionOptionsButton',
    };

    const helpAction = {
      id: 'help',
      label: i18n.translate('timelion.topNavMenu.helpButtonLabel', {
        defaultMessage: 'Help',
      }),
      description: i18n.translate('timelion.topNavMenu.helpButtonAriaLabel', {
        defaultMessage: 'Help',
      }),
      run: () => {
        $scope.$evalAsync(() => $scope.toggleMenu('showHelp'));
      },
      testId: 'timelionDocsButton',
    };

    if (capabilities.get().timelion.save) {
      return [
        newSheetAction,
        addSheetAction,
        saveSheetAction,
        deleteSheetAction,
        openSheetAction,
        optionsAction,
        helpAction,
      ];
    }
    return [newSheetAction, addSheetAction, openSheetAction, optionsAction, helpAction];
  }

  let refresher;
  const setRefreshData = function () {
    if (refresher) $timeout.cancel(refresher);
    const interval = timefilter.getRefreshInterval();
    if (interval.value > 0 && !interval.pause) {
      function startRefresh() {
        refresher = $timeout(function () {
          if (!$scope.running) $scope.search();
          startRefresh();
        }, interval.value);
      }
      startRefresh();
    }
  };

  const init = function () {
    $scope.running = false;
    $scope.search();
    setRefreshData();

    $scope.model = {
      timeRange: timefilter.getTime(),
      refreshInterval: timefilter.getRefreshInterval(),
    };

    $scope.$listen($scope.state, 'fetch_with_changes', $scope.search);
    timefilter.getFetch$().subscribe($scope.search);

    $scope.opts = {
      saveExpression: saveExpression,
      saveSheet: saveSheet,
      savedSheet: savedSheet,
      state: $scope.state,
      search: $scope.search,
      dontShowHelp: function () {
        config.set('timelion:showTutorial', false);
        $scope.setPage(0);
        $scope.closeMenus();
      },
    };

    $scope.menus = {
      showHelp: false,
      showSave: false,
      showLoad: false,
      showOptions: false,
    };

    $scope.toggleMenu = (menuName) => {
      const curState = $scope.menus[menuName];
      $scope.closeMenus();
      $scope.menus[menuName] = !curState;
    };

    $scope.closeMenus = () => {
      _.forOwn($scope.menus, function (value, key) {
        $scope.menus[key] = false;
      });
    };
  };

  $scope.onTimeUpdate = function ({ dateRange }) {
    $scope.model.timeRange = {
      ...dateRange,
    };
    timefilter.setTime(dateRange);
  };

  $scope.onRefreshChange = function ({ isPaused, refreshInterval }) {
    $scope.model.refreshInterval = {
      pause: isPaused,
      value: refreshInterval,
    };
    timefilter.setRefreshInterval({
      pause: isPaused,
      value: refreshInterval ? refreshInterval : $scope.refreshInterval.value,
    });

    setRefreshData();
  };

  $scope.$watch(
    function () {
      return savedSheet.lastSavedTitle;
    },
    function (newTitle) {
      docTitle.change(savedSheet.id ? newTitle : undefined);
    }
  );

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

    // parse the time range client side to make sure it behaves like other charts
    const timeRangeBounds = timefilter.getBounds();

    const httpResult = $http
      .post('../api/timelion/run', {
        sheet: $scope.state.sheet,
        time: _.assignIn(
          {
            from: timeRangeBounds.min,
            to: timeRangeBounds.max,
          },
          {
            interval: $scope.state.interval,
            timezone: timezone,
          }
        ),
      })
      .then((resp) => resp.data)
      .catch((resp) => {
        throw resp.data;
      });

    httpResult
      .then(function (resp) {
        $scope.stats = resp.stats;
        $scope.sheet = resp.sheet;
        _.each(resp.sheet, function (cell) {
          if (cell.exception) {
            $scope.state.selected = cell.plot;
          }
        });
        $scope.running = false;
      })
      .catch(function (resp) {
        $scope.sheet = [];
        $scope.running = false;

        const err = new Error(resp.message);
        err.stack = resp.stack;
        toastNotifications.addError(err, {
          title: i18n.translate('timelion.searchErrorTitle', {
            defaultMessage: 'Timelion request error',
          }),
        });
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
        toastNotifications.addSuccess({
          title: i18n.translate('timelion.saveSheet.successNotificationText', {
            defaultMessage: `Saved sheet '{title}'`,
            values: { title: savedSheet.title },
          }),
          'data-test-subj': 'timelionSaveSuccessToast',
        });

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
        interval: $scope.state.interval,
      };
      savedExpression.title = title;
      savedExpression.visState.title = title;
      savedExpression.save().then(function (id) {
        if (id) {
          toastNotifications.addSuccess(
            i18n.translate('timelion.saveExpression.successNotificationText', {
              defaultMessage: `Saved expression '{title}'`,
              values: { title: savedExpression.title },
            })
          );
        }
      });
    });
  }

  init();
});
