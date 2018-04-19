import _ from 'lodash';
import '../saved_visualizations/saved_visualizations';
import 'ui/vis/editors/default/sidebar';
import './agg_filter';
import 'ui/visualize';
import 'ui/collapsible_sidebar';
import 'ui/share';
import 'ui/query_bar';
import chrome from 'ui/chrome';
import angular from 'angular';
import { Notifier, toastNotifications } from 'ui/notify';
import { VisTypesRegistryProvider } from 'ui/registry/vis_types';
import { DocTitleProvider } from 'ui/doc_title';
import { FilterBarQueryFilterProvider } from 'ui/filter_bar/query_filter';
import { stateMonitorFactory } from 'ui/state_management/state_monitor_factory';
import uiRoutes from 'ui/routes';
import { uiModules } from 'ui/modules';
import editorTemplate from './editor.html';
import { DashboardConstants } from '../../dashboard/dashboard_constants';
import { VisualizeConstants } from '../visualize_constants';
import { KibanaParsedUrl } from 'ui/url/kibana_parsed_url';
import { absoluteToParsedUrl } from 'ui/url/absolute_to_parsed_url';
import { migrateLegacyQuery } from 'ui/utils/migrateLegacyQuery';
import { recentlyAccessed } from 'ui/persisted_log';

uiRoutes
  .when(VisualizeConstants.CREATE_PATH, {
    template: editorTemplate,
    resolve: {
      savedVis: function (savedVisualizations, courier, $route, Private) {
        const visTypes = Private(VisTypesRegistryProvider);
        const visType = _.find(visTypes, { name: $route.current.params.type });
        const shouldHaveIndex = visType.requiresSearch && visType.options.showIndexSelection;
        const hasIndex = $route.current.params.indexPattern || $route.current.params.savedSearchId;
        if (shouldHaveIndex && !hasIndex) {
          throw new Error('You must provide either an indexPattern or a savedSearchId');
        }

        return savedVisualizations.get($route.current.params)
          .catch(courier.redirectWhenMissing({
            '*': '/visualize'
          }));
      }
    }
  })
  .when(`${VisualizeConstants.EDIT_PATH}/:id`, {
    template: editorTemplate,
    resolve: {
      savedVis: function (savedVisualizations, courier, $route) {
        return savedVisualizations.get($route.current.params.id)
          .then((savedVis) => {
            recentlyAccessed.add(
              savedVis.getFullPath(),
              savedVis.title,
              savedVis.id);
            return savedVis;
          })
          .catch(courier.redirectWhenMissing({
            'visualization': '/visualize',
            'search': '/management/kibana/objects/savedVisualizations/' + $route.current.params.id,
            'index-pattern': '/management/kibana/objects/savedVisualizations/' + $route.current.params.id,
            'index-pattern-field': '/management/kibana/objects/savedVisualizations/' + $route.current.params.id
          }));
      }
    }
  });

uiModules
  .get('app/visualize', [
    'kibana/notify',
    'kibana/courier'
  ])
  .directive('visualizeApp', function () {
    return {
      restrict: 'E',
      controllerAs: 'visualizeApp',
      controller: VisEditor,
    };
  });

function VisEditor($scope, $route, timefilter, AppState, $window, kbnUrl, courier, Private, Promise, config, kbnBaseUrl, localStorage) {
  const docTitle = Private(DocTitleProvider);
  const queryFilter = Private(FilterBarQueryFilterProvider);

  const notify = new Notifier({
    location: 'Visualization Editor'
  });

  // Retrieve the resolved SavedVis instance.
  const savedVis = $route.current.locals.savedVis;
  // vis is instance of src/ui/public/vis/vis.js.
  // SearchSource is a promise-based stream of search results that can inherit from other search sources.
  const { vis, searchSource } = savedVis;
  $scope.vis = vis;

  $scope.topNavMenu = [{
    key: 'save',
    description: 'Save Visualization',
    template: require('plugins/kibana/visualize/editor/panels/save.html'),
    testId: 'visualizeSaveButton',
    disableButton() {
      return Boolean(vis.dirty);
    },
    tooltip() {
      if (vis.dirty) {
        return 'Apply or Discard your changes before saving';
      }
    }
  }, {
    key: 'share',
    description: 'Share Visualization',
    template: require('plugins/kibana/visualize/editor/panels/share.html'),
    testId: 'visualizeShareButton',
  }, {
    key: 'refresh',
    description: 'Refresh',
    run: function () {
      vis.forceReload();
    },
    testId: 'visualizeRefreshButton',
  }];

  let stateMonitor;

  const $appStatus = this.appStatus = {
    dirty: !savedVis.id
  };

  this.getSharingTitle = () => {
    return savedVis.title;
  };

  this.getSharingType = () => {
    return 'visualization';
  };

  if (savedVis.id) {
    docTitle.change(savedVis.title);
  }

  // Extract visualization state with filtered aggs. You can see these filtered aggs in the URL.
  // Consists of things like aggs, params, listeners, title, type, etc.
  const savedVisState = vis.getState();
  const stateDefaults = {
    uiState: savedVis.uiStateJSON ? JSON.parse(savedVis.uiStateJSON) : {},
    linked: !!savedVis.savedSearchId,
    query: searchSource.getOwn('query') || {
      query: '',
      language: localStorage.get('kibana.userQueryLanguage') || config.get('search:queryLanguage')
    },
    filters: searchSource.getOwn('filter') || [],
    vis: savedVisState
  };

  // Instance of app_state.js.
  const $state = (function initState() {
    // This is used to sync visualization state with the url when `appState.save()` is called.
    const appState = new AppState(stateDefaults);

    // The savedVis is pulled from elasticsearch, but the appState is pulled from the url, with the
    // defaults applied. If the url was from a previous session which included modifications to the
    // appState then they won't be equal.
    if (!angular.equals(appState.vis, savedVisState)) {
      Promise.try(function () {
        vis.setState(appState.vis);
      })
        .catch(courier.redirectWhenMissing({
          'index-pattern-field': '/visualize'
        }));
    }

    return appState;
  }());

  function init() {
    // export some objects
    $scope.savedVis = savedVis;
    $scope.indexPattern = vis.indexPattern;
    $scope.searchSource = searchSource;
    $scope.state = $state;

    // Create a PersistedState instance.
    $scope.uiState = $state.makeStateful('uiState');
    $scope.appStatus = $appStatus;

    const addToDashMode = $route.current.params[DashboardConstants.ADD_VISUALIZATION_TO_DASHBOARD_MODE_PARAM];
    kbnUrl.removeParam(DashboardConstants.ADD_VISUALIZATION_TO_DASHBOARD_MODE_PARAM);

    $scope.isAddToDashMode = () => addToDashMode;

    $scope.timefilter = timefilter;
    $scope.timeRange = timefilter.time;
    $scope.opts = _.pick($scope, 'doSave', 'savedVis', 'shareData', 'timefilter', 'isAddToDashMode');

    stateMonitor = stateMonitorFactory.create($state, stateDefaults);
    stateMonitor.ignoreProps([ 'vis.listeners' ]).onChange((status) => {
      $appStatus.dirty = status.dirty || !savedVis.id;
    });

    $scope.$watch('state.query', $scope.updateQueryAndFetch);

    $state.replace();

    $scope.getVisualizationTitle = function getVisualizationTitle() {
      return savedVis.lastSavedTitle || `${savedVis.title} (unsaved)`;
    };

    $scope.$watchMulti([
      'searchSource.get("index")',
      'vis.type.options.showTimePicker',
    ], function ([index, requiresTimePicker]) {
      const showTimeFilter = Boolean((!index || index.timeFieldName) && requiresTimePicker);

      if (showTimeFilter) {
        timefilter.enableTimeRangeSelector();
      } else {
        timefilter.disableTimeRangeSelector();
      }
    });

    const updateTimeRange = () => {
      $scope.timeRange = timefilter.time;
    };

    timefilter.enableAutoRefreshSelector();
    timefilter.on('update', updateTimeRange);

    // update the searchSource when filters update
    $scope.$listen(queryFilter, 'update', function () {
      $state.save();
    });

    // update the searchSource when query updates
    $scope.fetch = function () {
      $state.save();
      $scope.vis.forceReload();
    };

    $scope.$on('$destroy', function () {
      savedVis.destroy();
      stateMonitor.destroy();
      timefilter.off('update', updateTimeRange);
    });
  }

  $scope.updateQueryAndFetch = function (query) {
    $state.query = migrateLegacyQuery(query);
    $scope.fetch();
  };

  /**
   * Called when the user clicks "Save" button.
   */
  $scope.doSave = function () {
    // vis.title was not bound and it's needed to reflect title into visState
    $state.vis.title = savedVis.title;
    $state.vis.type = savedVis.type || $state.vis.type;
    savedVis.visState = $state.vis;
    savedVis.uiStateJSON = angular.toJson($scope.uiState.getChanges());

    savedVis.save()
      .then(function (id) {
        stateMonitor.setInitialState($state.toJSON());
        $scope.kbnTopNav.close('save');

        if (id) {
          toastNotifications.addSuccess({
            title: `Saved '${savedVis.title}'`,
            'data-test-subj': 'saveVisualizationSuccess',
          });

          if ($scope.isAddToDashMode()) {
            const savedVisualizationParsedUrl = new KibanaParsedUrl({
              basePath: chrome.getBasePath(),
              appId: kbnBaseUrl.slice('/app/'.length),
              appPath: kbnUrl.eval(`${VisualizeConstants.EDIT_PATH}/{{id}}`, { id: savedVis.id }),
            });
            // Manually insert a new url so the back button will open the saved visualization.
            $window.history.pushState({}, '', savedVisualizationParsedUrl.getRootRelativePath());
            // Since we aren't reloading the page, only inserting a new browser history item, we need to manually update
            // the last url for this app, so directly clicking on the Visualize tab will also bring the user to the saved
            // url, not the unsaved one.
            chrome.trackSubUrlForApp('kibana:visualize', savedVisualizationParsedUrl);

            const lastDashboardAbsoluteUrl = chrome.getNavLinkById('kibana:dashboard').lastSubUrl;
            const dashboardParsedUrl = absoluteToParsedUrl(lastDashboardAbsoluteUrl, chrome.getBasePath());
            dashboardParsedUrl.addQueryParameter(DashboardConstants.NEW_VISUALIZATION_ID_PARAM, savedVis.id);
            kbnUrl.change(dashboardParsedUrl.appPath);
          } else if (savedVis.id === $route.current.params.id) {
            docTitle.change(savedVis.lastSavedTitle);
          } else {
            kbnUrl.change(`${VisualizeConstants.EDIT_PATH}/{{id}}`, { id: savedVis.id });
          }
        }
      }, notify.error);
  };

  $scope.unlink = function () {
    if (!$state.linked) return;

    toastNotifications.addSuccess(`Unlinked from saved search '${savedVis.savedSearch.title}'`);

    $state.linked = false;
    const parent = searchSource.getParent(true);
    const parentsParent = parent.getParent(true);

    delete savedVis.savedSearchId;
    parent.set('filter', _.union(searchSource.getOwn('filter'), parent.getOwn('filter')));

    // copy over all state except "aggs", "query" and "filter"
    _(parent.toJSON())
      .omit(['aggs', 'filter', 'query'])
      .forOwn(function (val, key) {
        searchSource.set(key, val);
      })
      .commit();

    $state.query = searchSource.get('query');
    $state.filters = searchSource.get('filter');
    searchSource.inherits(parentsParent);

    $scope.fetch();
  };


  $scope.getAdditionalMessage = () => {
    return `<i class="kuiIcon fa-flask"></i> This visualization is marked as experimental. ${vis.type.feedbackMessage}`;
  };

  init();
}
