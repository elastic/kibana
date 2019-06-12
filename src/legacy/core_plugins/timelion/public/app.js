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

import { i18n } from '@kbn/i18n';

import { capabilities } from 'ui/capabilities';
import { DocTitleProvider } from 'ui/doc_title';
import { SavedObjectRegistryProvider } from 'ui/saved_objects/saved_object_registry';
import { notify, fatalError, toastNotifications } from 'ui/notify';
import { timezoneProvider } from 'ui/vis/lib/timezone';
import { recentlyAccessed } from 'ui/persisted_log';
import { timefilter } from 'ui/timefilter';
import { getSavedSheetBreadcrumbs, getCreateBreadcrumbs } from './breadcrumbs';

// import the uiExports that we want to "use"
import 'uiExports/fieldFormats';
import 'uiExports/savedObjectTypes';

require('ui/autoload/all');

// TODO: remove ui imports completely (move to plugins)
import 'ui/directives/input_focus';
import 'ui/directives/saved_object_finder';
import 'ui/listen';
import 'ui/kbn_top_nav';
import 'ui/saved_objects/ui/saved_object_save_as_checkbox';

import rootTemplate from 'plugins/timelion/index.html';
import saveTemplate from 'plugins/timelion/partials/save_sheet.html';
import loadTemplate from 'plugins/timelion/partials/load_sheet.html';
import sheetTemplate from 'plugins/timelion/partials/sheet_options.html';

require('plugins/timelion/directives/cells/cells');
require('plugins/timelion/directives/fixed_element');
require('plugins/timelion/directives/fullscreen/fullscreen');
require('plugins/timelion/directives/timelion_expression_input');
require('plugins/timelion/directives/timelion_help/timelion_help');
require('plugins/timelion/directives/timelion_interval/timelion_interval');

document.title = 'Timelion - Kibana';

const app = require('ui/modules').get('apps/timelion', []);

require('plugins/timelion/services/saved_sheets');
require('plugins/timelion/services/_saved_sheet');

require('./vis');

SavedObjectRegistryProvider.register(require('plugins/timelion/services/saved_sheet_register'));

const unsafeNotifications = notify._notifs;

require('ui/routes').enable();

require('ui/routes')
  .when('/:id?', {
    template: rootTemplate,
    reloadOnSearch: false,
    k7Breadcrumbs: ($injector, $route) => $injector.invoke(
      $route.current.params.id
        ? getSavedSheetBreadcrumbs
        : getCreateBreadcrumbs
    ),
    badge: uiCapabilities => {
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
        iconType: 'glasses'
      };
    },
    resolve: {
      savedSheet: function (redirectWhenMissing, savedSheets, $route) {
        return savedSheets.get($route.current.params.id)
          .then((savedSheet) => {
            if ($route.current.params.id) {
              recentlyAccessed.add(
                savedSheet.getFullPath(),
                savedSheet.title,
                savedSheet.id);
            }
            return savedSheet;
          })
          .catch(redirectWhenMissing({
            'search': '/'
          }));
      }
    }
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
  confirmModal,
  kbnUrl,
  Private
) {

  // Keeping this at app scope allows us to keep the current page when the user
  // switches to say, the timepicker.
  $scope.page = config.get('timelion:showTutorial', true) ? 1 : 0;
  $scope.setPage = (page) => $scope.page = page;

  timefilter.enableAutoRefreshSelector();
  timefilter.enableTimeRangeSelector();

  const savedVisualizations = Private(SavedObjectRegistryProvider).byLoaderPropertiesName.visualizations;
  const timezone = Private(timezoneProvider)();
  const docTitle = Private(DocTitleProvider);

  const defaultExpression = '.es(*)';
  const savedSheet = $route.current.locals.savedSheet;

  $scope.topNavMenu = getTopNavMenu();

  $timeout(function () {
    if (config.get('timelion:showTutorial', true)) {
      $scope.kbnTopNav.open('help');
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

  function getTopNavMenu() {

    const newSheetAction = {
      key: 'new',
      label: i18n.translate('timelion.topNavMenu.newSheetButtonLabel', {
        defaultMessage: 'New',
      }),
      description: i18n.translate('timelion.topNavMenu.newSheetButtonAriaLabel', {
        defaultMessage: 'New Sheet',
      }),
      run: function () { kbnUrl.change('/'); },
      testId: 'timelionNewButton',
    };

    const addSheetAction = {
      key: 'add',
      label: i18n.translate('timelion.topNavMenu.addChartButtonLabel', {
        defaultMessage: 'Add',
      }),
      description: i18n.translate('timelion.topNavMenu.addChartButtonAriaLabel', {
        defaultMessage: 'Add a chart',
      }),
      run: function () { $scope.newCell(); },
      testId: 'timelionAddChartButton',
    };

    const saveSheetAction = {
      key: 'save',
      label: i18n.translate('timelion.topNavMenu.saveSheetButtonLabel', {
        defaultMessage: 'Save',
      }),
      description: i18n.translate('timelion.topNavMenu.saveSheetButtonAriaLabel', {
        defaultMessage: 'Save Sheet',
      }),
      template: saveTemplate,
      testId: 'timelionSaveButton',
    };

    const deleteSheetAction = {
      key: 'delete',
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
          savedSheet.delete().then(() => {
            toastNotifications.addSuccess(i18n.translate(
              'timelion.topNavMenu.delete.modal.successNotificationText',
              {
                defaultMessage: `Deleted '{title}'`,
                values: { title },
              }
            ));
            kbnUrl.change('/');
          }).catch(error => fatalError(error, location));
        }

        const confirmModalOptions = {
          onConfirm: doDelete,
          confirmButtonText: i18n.translate('timelion.topNavMenu.delete.modal.confirmButtonLabel', {
            defaultMessage: 'Delete',
          }),
          title: i18n.translate('timelion.topNavMenu.delete.modalTitle', {
            defaultMessage: `Delete Timelion sheet '{title}'?`,
            values: { title }
          }),
        };

        confirmModal(
          i18n.translate('timelion.topNavMenu.delete.modal.warningText', {
            defaultMessage: `You can't recover deleted sheets.`,
          }),
          confirmModalOptions
        );
      },
      testId: 'timelionDeleteButton',
    };

    const openSheetAction = {
      key: 'open',
      label: i18n.translate('timelion.topNavMenu.openSheetButtonLabel', {
        defaultMessage: 'Open',
      }),
      description: i18n.translate('timelion.topNavMenu.openSheetButtonAriaLabel', {
        defaultMessage: 'Open Sheet',
      }),
      template: loadTemplate,
      testId: 'timelionOpenButton',
    };

    const optionsAction = {
      key: 'options',
      label: i18n.translate('timelion.topNavMenu.optionsButtonLabel', {
        defaultMessage: 'Options',
      }),
      description: i18n.translate('timelion.topNavMenu.optionsButtonAriaLabel', {
        defaultMessage: 'Options',
      }),
      template: sheetTemplate,
      testId: 'timelionOptionsButton',
    };

    const helpAction = {
      key: 'help',
      label: i18n.translate('timelion.topNavMenu.helpButtonLabel', {
        defaultMessage: 'Help',
      }),
      description: i18n.translate('timelion.topNavMenu.helpButtonAriaLabel', {
        defaultMessage: 'Help',
      }),
      template: '<timelion-help></timelion-help>',
      testId: 'timelionDocsButton',
    };

    if (capabilities.get().timelion.save) {
      return [newSheetAction, addSheetAction, saveSheetAction, deleteSheetAction, openSheetAction, optionsAction, helpAction];
    }
    return [newSheetAction, addSheetAction, openSheetAction, optionsAction, helpAction];
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
        $scope.kbnTopNav.close('help');
      }
    };
  };

  let refresher;
  $scope.$listen(timefilter, 'refreshIntervalUpdate', function () {
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

    const httpResult = $http.post('../api/timelion/run', {
      sheet: $scope.state.sheet,
      time: _.extend(timefilter.getTime(), {
        interval: $scope.state.interval,
        timezone: timezone
      }),
    })
      .then(resp => resp.data)
      .catch(resp => { throw resp.data; });

    httpResult
      .then(function (resp) {
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
        interval: $scope.state.interval
      };
      savedExpression.title = title;
      savedExpression.visState.title = title;
      savedExpression.save().then(function (id) {
        if (id) {
          toastNotifications.addSuccess(
            i18n.translate('timelion.saveExpression.successNotificationText', {
              defaultMessage: `Saved expression '{title}'`,
              values: { title: savedExpression.title },
            }),
          );
        }
      });
    });
  }

  function dismissNotifications() {
    unsafeNotifications.splice(0, unsafeNotifications.length);
  }

  init();
});
