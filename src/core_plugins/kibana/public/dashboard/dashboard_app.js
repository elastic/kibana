import _ from 'lodash';
import angular from 'angular';
import { uiModules } from 'ui/modules';
import chrome from 'ui/chrome';
import { applyTheme } from 'ui/theme';
import { toastNotifications } from 'ui/notify';

import 'ui/query_bar';

import { getDashboardTitle } from './dashboard_strings';
import { DashboardViewMode } from './dashboard_view_mode';
import { TopNavIds } from './top_nav/top_nav_ids';
import { ConfirmationButtonTypes } from 'ui/modals/confirm_modal';
import { FilterBarQueryFilterProvider } from 'ui/filter_bar/query_filter';
import { DocTitleProvider } from 'ui/doc_title';
import { getTopNavConfig } from './top_nav/get_top_nav_config';
import { DashboardConstants, createDashboardEditUrl } from './dashboard_constants';
import { VisualizeConstants } from '../visualize/visualize_constants';
import { DashboardStateManager } from './dashboard_state_manager';
import { saveDashboard } from './lib';
import { showCloneModal } from './top_nav/show_clone_modal';
import { migrateLegacyQuery } from 'ui/utils/migrateLegacyQuery';
import { DashboardContainerAPI } from './dashboard_container_api';
import * as filterActions from 'ui/doc_table/actions/filter';
import { FilterManagerProvider } from 'ui/filter_manager';
import { EmbeddableFactoriesRegistryProvider } from 'ui/embeddable/embeddable_factories_registry';

import { DashboardViewportProvider } from './viewport/dashboard_viewport_provider';

const app = uiModules.get('app/dashboard', [
  'elasticsearch',
  'ngRoute',
  'react',
  'kibana/courier',
  'kibana/config',
  'kibana/notify',
  'kibana/typeahead',
]);

app.directive('dashboardViewportProvider', function (reactDirective) {
  return reactDirective(DashboardViewportProvider);
});

app.directive('dashboardApp', function ($injector) {
  const Notifier = $injector.get('Notifier');
  const courier = $injector.get('courier');
  const AppState = $injector.get('AppState');
  const timefilter = $injector.get('timefilter');
  const kbnUrl = $injector.get('kbnUrl');
  const confirmModal = $injector.get('confirmModal');
  const config = $injector.get('config');
  const Private = $injector.get('Private');

  return {
    restrict: 'E',
    controllerAs: 'dashboardApp',
    controller: function ($scope, $rootScope, $route, $routeParams, $location, getAppState, $compile, dashboardConfig, localStorage) {
      const filterManager = Private(FilterManagerProvider);
      const filterBar = Private(FilterBarQueryFilterProvider);
      const docTitle = Private(DocTitleProvider);
      const notify = new Notifier({ location: 'Dashboard' });
      const embeddableFactories = Private(EmbeddableFactoriesRegistryProvider);
      $scope.getEmbeddableFactory = panelType => embeddableFactories.byName[panelType];

      const dash = $scope.dash = $route.current.locals.dash;
      if (dash.id) {
        docTitle.change(dash.title);
      }

      const dashboardStateManager = new DashboardStateManager(dash, AppState, dashboardConfig.getHideWriteControls());

      $scope.getDashboardState = () => dashboardStateManager;
      $scope.appState = dashboardStateManager.getAppState();
      $scope.containerApi = new DashboardContainerAPI(
        dashboardStateManager,
        (field, value, operator, index) => {
          filterActions.addFilter(field, value, operator, index, dashboardStateManager.getAppState(), filterManager);
          dashboardStateManager.saveState();
        }
      );
      $scope.getContainerApi = () => $scope.containerApi;

      // The 'previouslyStored' check is so we only update the time filter on dashboard open, not during
      // normal cross app navigation.
      if (dashboardStateManager.getIsTimeSavedWithDashboard() && !getAppState.previouslyStored()) {
        dashboardStateManager.syncTimefilterWithDashboard(timefilter, config.get('timepicker:quickRanges'));
      }

      const updateState = () => {
        // Following the "best practice" of always have a '.' in your ng-models –
        // https://github.com/angular/angular.js/wiki/Understanding-Scopes
        $scope.model = {
          query: dashboardStateManager.getQuery(),
          useMargins: dashboardStateManager.getUseMargins(),
          hidePanelTitles: dashboardStateManager.getHidePanelTitles(),
          darkTheme: dashboardStateManager.getDarkTheme(),
          timeRestore: dashboardStateManager.getTimeRestore(),
          title: dashboardStateManager.getTitle(),
          description: dashboardStateManager.getDescription(),
        };
        $scope.panels = dashboardStateManager.getPanels();
        $scope.indexPatterns = dashboardStateManager.getPanelIndexPatterns();
      };

      // Part of the exposed plugin API - do not remove without careful consideration.
      this.appStatus = {
        dirty: !dash.id
      };

      this.getSharingTitle = () => {
        return dash.title;
      };

      this.getSharingType = () => {
        return 'dashboard';
      };

      dashboardStateManager.registerChangeListener(status => {
        this.appStatus.dirty = status.dirty || !dash.id;
        updateState();
      });

      dashboardStateManager.applyFilters(
        dashboardStateManager.getQuery() || {
          query: '',
          language: localStorage.get('kibana.userQueryLanguage') || config.get('search:queryLanguage')
        },
        filterBar.getFilters()
      );

      timefilter.enableAutoRefreshSelector();
      timefilter.enableTimeRangeSelector();
      dash.searchSource.highlightAll(true);
      dash.searchSource.version(true);
      courier.setRootSearchSource(dash.searchSource);

      updateState();

      $scope.refresh = (...args) => {
        $rootScope.$broadcast('fetch');
        courier.fetch(...args);
      };
      $scope.timefilter = timefilter;
      $scope.expandedPanel = null;
      $scope.dashboardViewMode = dashboardStateManager.getViewMode();

      $scope.landingPageUrl = () => `#${DashboardConstants.LANDING_PAGE_PATH}`;
      $scope.hasExpandedPanel = () => $scope.expandedPanel !== null;
      $scope.getDashTitle = () => getDashboardTitle(
        dashboardStateManager.getTitle(),
        dashboardStateManager.getViewMode(),
        dashboardStateManager.getIsDirty(timefilter));
      $scope.newDashboard = () => { kbnUrl.change(DashboardConstants.CREATE_NEW_DASHBOARD_URL, {}); };
      $scope.saveState = () => dashboardStateManager.saveState();
      $scope.getShouldShowEditHelp = () => (
        !dashboardStateManager.getPanels().length &&
        dashboardStateManager.getIsEditMode() &&
        !dashboardConfig.getHideWriteControls()
      );
      $scope.getShouldShowViewHelp = () => (
        !dashboardStateManager.getPanels().length &&
        dashboardStateManager.getIsViewMode() &&
        !dashboardConfig.getHideWriteControls()
      );

      $scope.minimizeExpandedPanel = () => {
        $scope.expandedPanel = null;
      };

      $scope.expandPanel = (panelIndex) => {
        $scope.expandedPanel =
            dashboardStateManager.getPanels().find((panel) => panel.panelIndex === panelIndex);
      };

      $scope.updateQueryAndFetch = function (query) {
        $scope.model.query = migrateLegacyQuery(query);
        dashboardStateManager.applyFilters($scope.model.query, filterBar.getFilters());
        $scope.refresh();
      };

      // called by the saved-object-finder when a user clicks a vis
      $scope.addVis = function (hit, showToast = true) {
        dashboardStateManager.addNewPanel(hit.id, 'visualization');
        if (showToast) {
          toastNotifications.addSuccess({
            title: 'Visualization was added to your dashboard',
            'data-test-subj': 'addVisualizationToDashboardSuccess',
          });
        }
      };

      $scope.addSearch = function (hit) {
        dashboardStateManager.addNewPanel(hit.id, 'search');
        toastNotifications.addSuccess({
          title: 'Saved search was added to your dashboard',
          'data-test-subj': 'addSavedSearchToDashboardSuccess',
        });
      };

      $scope.$watch('model.hidePanelTitles', () => {
        dashboardStateManager.setHidePanelTitles($scope.model.hidePanelTitles);
      });
      $scope.$watch('model.useMargins', () => {
        dashboardStateManager.setUseMargins($scope.model.useMargins);
      });
      $scope.$watch('model.darkTheme', () => {
        dashboardStateManager.setDarkTheme($scope.model.darkTheme);
        updateTheme();
      });
      $scope.$watch('model.description', () => dashboardStateManager.setDescription($scope.model.description));
      $scope.$watch('model.title', () => dashboardStateManager.setTitle($scope.model.title));
      $scope.$watch('model.timeRestore', () => dashboardStateManager.setTimeRestore($scope.model.timeRestore));
      $scope.indexPatterns = [];

      $scope.registerPanelIndexPattern = (panelIndex, pattern) => {
        dashboardStateManager.registerPanelIndexPatternMap(panelIndex, pattern);
        $scope.indexPatterns = dashboardStateManager.getPanelIndexPatterns();
      };

      $scope.onPanelRemoved = (panelIndex) => {
        dashboardStateManager.removePanel(panelIndex);
        $scope.indexPatterns = dashboardStateManager.getPanelIndexPatterns();
      };

      $scope.$watch('model.query', $scope.updateQueryAndFetch);

      $scope.$listen(timefilter, 'fetch', $scope.refresh);

      function updateViewMode(newMode) {
        $scope.topNavMenu = getTopNavConfig(newMode, navActions, dashboardConfig.getHideWriteControls()); // eslint-disable-line no-use-before-define
        dashboardStateManager.switchViewMode(newMode);
        $scope.dashboardViewMode = newMode;
      }

      const onChangeViewMode = (newMode) => {
        const isPageRefresh = newMode === dashboardStateManager.getViewMode();
        const isLeavingEditMode = !isPageRefresh && newMode === DashboardViewMode.VIEW;
        const willLoseChanges = isLeavingEditMode && dashboardStateManager.getIsDirty(timefilter);

        if (!willLoseChanges) {
          updateViewMode(newMode);
          return;
        }

        function revertChangesAndExitEditMode() {
          dashboardStateManager.resetState();
          kbnUrl.change(dash.id ? createDashboardEditUrl(dash.id) : DashboardConstants.CREATE_NEW_DASHBOARD_URL);
          // This is only necessary for new dashboards, which will default to Edit mode.
          updateViewMode(DashboardViewMode.VIEW);

          // We need to do a hard reset of the timepicker. appState will not reload like
          // it does on 'open' because it's been saved to the url and the getAppState.previouslyStored() check on
          // reload will cause it not to sync.
          if (dashboardStateManager.getIsTimeSavedWithDashboard()) {
            dashboardStateManager.syncTimefilterWithDashboard(timefilter, config.get('timepicker:quickRanges'));
          }
        }

        confirmModal(
          `Once you discard your changes, there's no getting them back.`,
          {
            onConfirm: revertChangesAndExitEditMode,
            onCancel: _.noop,
            confirmButtonText: 'Discard changes',
            cancelButtonText: 'Continue editing',
            defaultFocusedButton: ConfirmationButtonTypes.CANCEL,
            title: 'Discard changes to dashboard?'
          }
        );
      };

      $scope.save = function () {
        return saveDashboard(angular.toJson, timefilter, dashboardStateManager)
          .then(function (id) {
            $scope.kbnTopNav.close('save');
            if (id) {
              toastNotifications.addSuccess({
                title: `Dashboard '${dash.title}' was saved`,
                'data-test-subj': 'saveDashboardSuccess',
              });

              if (dash.id !== $routeParams.id) {
                kbnUrl.change(createDashboardEditUrl(dash.id));
              } else {
                docTitle.change(dash.lastSavedTitle);
                updateViewMode(DashboardViewMode.VIEW);
              }
            }
            return id;
          }).catch(notify.error);
      };

      $scope.showFilterBar = () => filterBar.getFilters().length > 0 || !dashboardStateManager.getFullScreenMode();

      $scope.showAddPanel = () => {
        dashboardStateManager.setFullScreenMode(false);
        $scope.kbnTopNav.open('add');
      };
      $scope.enterEditMode = () => {
        dashboardStateManager.setFullScreenMode(false);
        $scope.kbnTopNav.click('edit');
      };
      const navActions = {};
      navActions[TopNavIds.FULL_SCREEN] = () =>
        dashboardStateManager.setFullScreenMode(true);
      navActions[TopNavIds.EXIT_EDIT_MODE] = () => onChangeViewMode(DashboardViewMode.VIEW);
      navActions[TopNavIds.ENTER_EDIT_MODE] = () => onChangeViewMode(DashboardViewMode.EDIT);
      navActions[TopNavIds.CLONE] = () => {
        const currentTitle = $scope.model.title;
        const onClone = (newTitle) => {
          dashboardStateManager.savedDashboard.copyOnSave = true;
          dashboardStateManager.setTitle(newTitle);
          return $scope.save().then(id => {
            // If the save wasn't successful, put the original title back.
            if (!id) {
              $scope.model.title = currentTitle;
              // There is a watch on $scope.model.title that *should* call this automatically but
              // angular is failing to trigger it, so do so manually here.
              dashboardStateManager.setTitle(currentTitle);
            }
            return id;
          });
        };

        showCloneModal(onClone, currentTitle, $rootScope, $compile);
      };
      updateViewMode(dashboardStateManager.getViewMode());

      // update root source when filters update
      $scope.$listen(filterBar, 'update', function () {
        dashboardStateManager.applyFilters($scope.model.query, filterBar.getFilters());
      });

      // update data when filters fire fetch event
      $scope.$listen(filterBar, 'fetch', $scope.refresh);

      $scope.$on('$destroy', () => {
        dashboardStateManager.destroy();

        // Remove dark theme to keep it from affecting the appearance of other apps.
        setLightTheme();
      });

      function updateTheme() {
        dashboardStateManager.getDarkTheme() ? setDarkTheme() : setLightTheme();
      }

      function setDarkTheme() {
        chrome.removeApplicationClass(['theme-light']);
        chrome.addApplicationClass('theme-dark');
        applyTheme('dark');
      }

      function setLightTheme() {
        chrome.removeApplicationClass(['theme-dark']);
        chrome.addApplicationClass('theme-light');
        applyTheme('light');
      }

      if ($route.current.params && $route.current.params[DashboardConstants.NEW_VISUALIZATION_ID_PARAM]) {
        // Hide the toast message since they will already see a notification from saving the visualization,
        // and one is sufficient (especially given how the screen jumps down a bit for each unique notification).
        const showToast = false;
        $scope.addVis({ id: $route.current.params[DashboardConstants.NEW_VISUALIZATION_ID_PARAM] }, showToast);

        kbnUrl.removeParam(DashboardConstants.ADD_VISUALIZATION_TO_DASHBOARD_MODE_PARAM);
        kbnUrl.removeParam(DashboardConstants.NEW_VISUALIZATION_ID_PARAM);
      }

      const addNewVis = function addNewVis() {
        kbnUrl.change(
          `${VisualizeConstants.WIZARD_STEP_1_PAGE_PATH}?${DashboardConstants.ADD_VISUALIZATION_TO_DASHBOARD_MODE_PARAM}`);
      };

      $scope.opts = {
        displayName: dash.getDisplayName(),
        dashboard: dash,
        save: $scope.save,
        addVis: $scope.addVis,
        addNewVis,
        addSearch: $scope.addSearch,
        timefilter: $scope.timefilter
      };
    }
  };
});
