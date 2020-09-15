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

import { createHashHistory } from 'history';

import { createKbnUrlStateStorage, withNotifyOnErrors } from '../../kibana_utils/public';
import { syncQueryStateWithUrl } from '../../data/public';

import { getSavedSheetBreadcrumbs, getCreateBreadcrumbs } from './breadcrumbs';
import {
  addFatalError,
  registerListenEventListener,
  watchMultiDecorator,
} from '../../kibana_legacy/public';
import { getTimezone } from '../../vis_type_timelion/public';
import { initCellsDirective } from './directives/cells/cells';
import { initFullscreenDirective } from './directives/fullscreen/fullscreen';
import { initFixedElementDirective } from './directives/fixed_element';
import { initTimelionLoadSheetDirective } from './directives/timelion_load_sheet';
import { initTimelionHelpDirective } from './directives/timelion_help/timelion_help';
import { initTimelionSaveSheetDirective } from './directives/timelion_save_sheet';
import { initTimelionOptionsSheetDirective } from './directives/timelion_options_sheet';
import { initSavedObjectSaveAsCheckBoxDirective } from './directives/saved_object_save_as_checkbox';
import { initSavedObjectFinderDirective } from './directives/saved_object_finder';
import { initTimelionTabsDirective } from './components/timelionhelp_tabs_directive';
import { initTimelionTDeprecationDirective } from './components/timelion_deprecation_directive';
import { initInputFocusDirective } from './directives/input_focus';
import { Chart } from './directives/chart/chart';
import { TimelionInterval } from './directives/timelion_interval/timelion_interval';
import { timelionExpInput } from './directives/timelion_expression_input';
import { TimelionExpressionSuggestions } from './directives/timelion_expression_suggestions/timelion_expression_suggestions';
import { initSavedSheetService } from './services/saved_sheets';
import { initTimelionAppState } from './timelion_app_state';

import rootTemplate from './index.html';

export function initTimelionApp(app, deps) {
  app.run(registerListenEventListener);

  const savedSheetLoader = initSavedSheetService(app, deps);

  app.factory('history', () => createHashHistory());
  app.factory('kbnUrlStateStorage', (history) =>
    createKbnUrlStateStorage({
      history,
      useHash: deps.core.uiSettings.get('state:storeInSessionStorage'),
      ...withNotifyOnErrors(deps.core.notifications.toasts),
    })
  );
  app.config(watchMultiDecorator);

  app
    .controller('TimelionVisController', function ($scope) {
      $scope.$on('timelionChartRendered', (event) => {
        event.stopPropagation();
        $scope.renderComplete();
      });
    })
    .constant('timelionPanels', deps.timelionPanels)
    .directive('chart', Chart)
    .directive('timelionInterval', TimelionInterval)
    .directive('timelionExpressionSuggestions', TimelionExpressionSuggestions)
    .directive('timelionExpressionInput', timelionExpInput(deps));

  initTimelionHelpDirective(app);
  initInputFocusDirective(app);
  initTimelionTabsDirective(app, deps);
  initTimelionTDeprecationDirective(app, deps);
  initSavedObjectFinderDirective(app, savedSheetLoader, deps.core.uiSettings);
  initSavedObjectSaveAsCheckBoxDirective(app);
  initCellsDirective(app);
  initFixedElementDirective(app);
  initFullscreenDirective(app);
  initTimelionSaveSheetDirective(app);
  initTimelionLoadSheetDirective(app);
  initTimelionOptionsSheetDirective(app);

  const location = 'Timelion';

  app.directive('timelionApp', function () {
    return {
      restrict: 'E',
      controllerAs: 'timelionApp',
      controller: timelionController,
    };
  });

  function timelionController(
    $http,
    $route,
    $routeParams,
    $scope,
    $timeout,
    history,
    kbnUrlStateStorage
  ) {
    // Keeping this at app scope allows us to keep the current page when the user
    // switches to say, the timepicker.
    $scope.page = deps.core.uiSettings.get('timelion:showTutorial', true) ? 1 : 0;
    $scope.setPage = (page) => ($scope.page = page);
    const timefilter = deps.plugins.data.query.timefilter.timefilter;

    timefilter.enableAutoRefreshSelector();
    timefilter.enableTimeRangeSelector();

    deps.core.chrome.docTitle.change('Timelion - Kibana');

    // starts syncing `_g` portion of url with query services
    const { stop: stopSyncingQueryServiceStateWithUrl } = syncQueryStateWithUrl(
      deps.plugins.data.query,
      kbnUrlStateStorage
    );

    const savedSheet = $route.current.locals.savedSheet;

    function getStateDefaults() {
      return {
        sheet: savedSheet.timelion_sheet,
        selected: 0,
        columns: savedSheet.timelion_columns,
        rows: savedSheet.timelion_rows,
        interval: savedSheet.timelion_interval,
      };
    }

    const { stateContainer, stopStateSync } = initTimelionAppState({
      stateDefaults: getStateDefaults(),
      kbnUrlStateStorage,
    });

    $scope.state = _.cloneDeep(stateContainer.getState());
    $scope.expression = _.clone($scope.state.sheet[$scope.state.selected]);
    $scope.updatedSheets = [];

    const savedVisualizations = deps.plugins.visualizations.savedVisualizationsLoader;
    const timezone = getTimezone(deps.core.uiSettings);

    const defaultExpression = '.es(*)';

    $scope.topNavMenu = getTopNavMenu();

    $timeout(function () {
      if (deps.core.uiSettings.get('timelion:showTutorial', true)) {
        $scope.toggleMenu('showHelp');
      }
    }, 0);

    $scope.transient = {};

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
          history.push('/');
          $route.reload();
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
                deps.core.notifications.toasts.addSuccess(
                  i18n.translate('timelion.topNavMenu.delete.modal.successNotificationText', {
                    defaultMessage: `Deleted '{title}'`,
                    values: { title },
                  })
                );
                history.push('/');
              })
              .catch((error) => addFatalError(deps.core.fatalErrors, error, location));
          }

          const confirmModalOptions = {
            confirmButtonText: i18n.translate(
              'timelion.topNavMenu.delete.modal.confirmButtonLabel',
              {
                defaultMessage: 'Delete',
              }
            ),
            title: i18n.translate('timelion.topNavMenu.delete.modalTitle', {
              defaultMessage: `Delete Timelion sheet '{title}'?`,
              values: { title },
            }),
          };

          $scope.$evalAsync(() => {
            deps.core.overlays
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

      if (deps.core.application.capabilities.timelion.save) {
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

      const unsubscribeStateUpdates = stateContainer.subscribe((state) => {
        const clonedState = _.cloneDeep(state);
        $scope.updatedSheets.forEach((updatedSheet) => {
          clonedState.sheet[updatedSheet.id] = updatedSheet.expression;
        });
        $scope.state = clonedState;
        $scope.opts.state = clonedState;
        $scope.expression = _.clone($scope.state.sheet[$scope.state.selected]);
        $scope.search();
      });

      timefilter.getFetch$().subscribe($scope.search);

      $scope.opts = {
        saveExpression: saveExpression,
        saveSheet: saveSheet,
        savedSheet: savedSheet,
        state: _.cloneDeep(stateContainer.getState()),
        search: $scope.search,
        dontShowHelp: function () {
          deps.core.uiSettings.set('timelion:showTutorial', false);
          $scope.setPage(0);
          $scope.closeMenus();
        },
      };

      $scope.$watch('opts.state.rows', function (newRow) {
        const state = stateContainer.getState();
        if (state.rows !== newRow) {
          stateContainer.transitions.set('rows', newRow);
        }
      });

      $scope.$watch('opts.state.columns', function (newColumn) {
        const state = stateContainer.getState();
        if (state.columns !== newColumn) {
          stateContainer.transitions.set('columns', newColumn);
        }
      });

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

      $scope.$on('$destroy', () => {
        stopSyncingQueryServiceStateWithUrl();
        unsubscribeStateUpdates();
        stopStateSync();
      });
    };

    $scope.onTimeUpdate = function ({ dateRange }) {
      $scope.model.timeRange = {
        ...dateRange,
      };
      timefilter.setTime(dateRange);
      if (!$scope.running) $scope.search();
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
        if (savedSheet.id && newTitle) {
          deps.core.chrome.docTitle.change(newTitle);
        }
      }
    );

    $scope.$watch('expression', function (newExpression) {
      const state = stateContainer.getState();
      if (state.sheet[state.selected] !== newExpression) {
        const updatedSheet = $scope.updatedSheets.find(
          (updatedSheet) => updatedSheet.id === state.selected
        );
        if (updatedSheet) {
          updatedSheet.expression = newExpression;
        } else {
          $scope.updatedSheets.push({
            id: state.selected,
            expression: newExpression,
          });
        }
      }
    });

    $scope.toggle = function (property) {
      $scope[property] = !$scope[property];
    };

    $scope.changeInterval = function (interval) {
      $scope.currentInterval = interval;
    };

    $scope.updateChart = function () {
      const state = stateContainer.getState();
      const newSheet = _.clone(state.sheet);
      if ($scope.updatedSheets.length) {
        $scope.updatedSheets.forEach((updatedSheet) => {
          newSheet[updatedSheet.id] = updatedSheet.expression;
        });
        $scope.updatedSheets = [];
      }
      stateContainer.transitions.updateState({
        interval: $scope.currentInterval ? $scope.currentInterval : state.interval,
        sheet: newSheet,
      });
    };

    $scope.newSheet = function () {
      history.push('/');
    };

    $scope.removeSheet = function (removedIndex) {
      const state = stateContainer.getState();
      const newSheet = state.sheet.filter((el, index) => index !== removedIndex);
      $scope.updatedSheets = $scope.updatedSheets.filter((el) => el.id !== removedIndex);
      stateContainer.transitions.updateState({
        sheet: newSheet,
        selected: removedIndex ? removedIndex - 1 : removedIndex,
      });
    };

    $scope.newCell = function () {
      const state = stateContainer.getState();
      const newSheet = [...state.sheet, defaultExpression];
      stateContainer.transitions.updateState({ sheet: newSheet, selected: newSheet.length - 1 });
    };

    $scope.setActiveCell = function (cell) {
      const state = stateContainer.getState();
      if (state.selected !== cell) {
        stateContainer.transitions.updateState({ sheet: $scope.state.sheet, selected: cell });
      }
    };

    $scope.search = function () {
      $scope.running = true;
      const state = stateContainer.getState();

      // parse the time range client side to make sure it behaves like other charts
      const timeRangeBounds = timefilter.getBounds();

      const httpResult = $http
        .post('../api/timelion/run', {
          sheet: state.sheet,
          time: _.assignIn(
            {
              from: timeRangeBounds.min,
              to: timeRangeBounds.max,
            },
            {
              interval: state.interval,
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
          _.forEach(resp.sheet, function (cell) {
            if (cell.exception && cell.plot !== state.selected) {
              stateContainer.transitions.set('selected', cell.plot);
            }
          });
          $scope.running = false;
        })
        .catch(function (resp) {
          $scope.sheet = [];
          $scope.running = false;

          const err = new Error(resp.message);
          err.stack = resp.stack;
          deps.core.notifications.toasts.addError(err, {
            title: i18n.translate('timelion.searchErrorTitle', {
              defaultMessage: 'Timelion request error',
            }),
          });
        });
    };

    $scope.safeSearch = _.debounce($scope.search, 500);

    function saveSheet() {
      const state = stateContainer.getState();
      savedSheet.timelion_sheet = state.sheet;
      savedSheet.timelion_interval = state.interval;
      savedSheet.timelion_columns = state.columns;
      savedSheet.timelion_rows = state.rows;
      savedSheet.save().then(function (id) {
        if (id) {
          deps.core.notifications.toasts.addSuccess({
            title: i18n.translate('timelion.saveSheet.successNotificationText', {
              defaultMessage: `Saved sheet '{title}'`,
              values: { title: savedSheet.title },
            }),
            'data-test-subj': 'timelionSaveSuccessToast',
          });

          if (savedSheet.id !== $routeParams.id) {
            history.push(`/${savedSheet.id}`);
          }
        }
      });
    }

    async function saveExpression(title) {
      const vis = await deps.plugins.visualizations.createVis('timelion', {
        title,
        params: {
          expression: $scope.state.sheet[$scope.state.selected],
          interval: $scope.state.interval,
        },
      });
      const state = deps.plugins.visualizations.convertFromSerializedVis(vis.serialize());
      const visSavedObject = await savedVisualizations.get();
      Object.assign(visSavedObject, state);
      const id = await visSavedObject.save();
      if (id) {
        deps.core.notifications.toasts.addSuccess(
          i18n.translate('timelion.saveExpression.successNotificationText', {
            defaultMessage: `Saved expression '{title}'`,
            values: { title: state.title },
          })
        );
      }
    }

    init();
  }

  app.config(function ($routeProvider) {
    $routeProvider
      .when('/:id?', {
        template: rootTemplate,
        reloadOnSearch: false,
        k7Breadcrumbs: ($injector, $route) =>
          $injector.invoke(
            $route.current.params.id ? getSavedSheetBreadcrumbs : getCreateBreadcrumbs
          ),
        badge: () => {
          if (deps.core.application.capabilities.timelion.save) {
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
          savedSheet: function (savedSheets, $route) {
            return savedSheets
              .get($route.current.params.id)
              .then((savedSheet) => {
                if ($route.current.params.id) {
                  deps.core.chrome.recentlyAccessed.add(
                    savedSheet.getFullPath(),
                    savedSheet.title,
                    savedSheet.id
                  );
                }
                return savedSheet;
              })
              .catch();
          },
        },
      })
      .otherwise('/');
  });
}
