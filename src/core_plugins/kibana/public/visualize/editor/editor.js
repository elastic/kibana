import _ from 'lodash';
import 'plugins/kibana/visualize/saved_visualizations/saved_visualizations';
import 'plugins/kibana/visualize/editor/sidebar';
import 'plugins/kibana/visualize/editor/agg_filter';
import 'ui/visualize';
import 'ui/collapsible_sidebar';
import 'ui/share';
import chrome from 'ui/chrome';
import angular from 'angular';
import { Notifier } from 'ui/notify/notifier';
import { VisTypesRegistryProvider } from 'ui/registry/vis_types';
import { DocTitleProvider } from 'ui/doc_title';
import { FilterBarQueryFilterProvider } from 'ui/filter_bar/query_filter';
import { stateMonitorFactory } from 'ui/state_management/state_monitor_factory';
import uiRoutes from 'ui/routes';
import { uiModules } from 'ui/modules';
import editorTemplate from 'plugins/kibana/visualize/editor/editor.html';
import { DashboardConstants } from 'plugins/kibana/dashboard/dashboard_constants';
import { VisualizeConstants } from '../visualize_constants';
import { documentationLinks } from 'ui/documentation_links/documentation_links';

uiRoutes
.when(VisualizeConstants.CREATE_PATH, {
  template: editorTemplate,
  resolve: {
    savedVis: function (savedVisualizations, courier, $route, Private) {
      const visTypes = Private(VisTypesRegistryProvider);
      const visType = _.find(visTypes, { name: $route.current.params.type });
      if (visType.requiresSearch && !$route.current.params.indexPattern && !$route.current.params.savedSearchId) {
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

function VisEditor($scope, $route, timefilter, AppState, $window, kbnUrl, courier, Private, Promise) {
  const docTitle = Private(DocTitleProvider);
  const queryFilter = Private(FilterBarQueryFilterProvider);

  const notify = new Notifier({
    location: 'Visualization Editor'
  });

  $scope.topNavMenu = [{
    key: 'save',
    description: 'Save Visualization',
    template: require('plugins/kibana/visualize/editor/panels/save.html'),
    testId: 'visualizeSaveButton',
  }, {
    key: 'share',
    description: 'Share Visualization',
    template: require('plugins/kibana/visualize/editor/panels/share.html'),
    testId: 'visualizeShareButton',
  }, {
    key: 'refresh',
    description: 'Refresh',
    run: function () { $scope.fetch(); },
    testId: 'visualizeRefreshButton',
  }];

  let stateMonitor;

  // Retrieve the resolved SavedVis instance.
  const savedVis = $route.current.locals.savedVis;

  const $appStatus = this.appStatus = {
    dirty: !savedVis.id
  };

  if (savedVis.id) {
    docTitle.change(savedVis.title);
  }

  // vis is instance of src/ui/public/vis/vis.js.
  // SearchSource is a promise-based stream of search results that can inherit from other search sources.
  const { vis, searchSource } = savedVis;
  $scope.vis = vis;

  // Extract visualization state with filtered aggs. You can see these filtered aggs in the URL.
  // Consists of things like aggs, params, listeners, title, type, etc.
  const savedVisState = vis.getState();
  const stateDefaults = {
    uiState: savedVis.uiStateJSON ? JSON.parse(savedVis.uiStateJSON) : {},
    linked: !!savedVis.savedSearchId,
    query: searchSource.getOwn('query') || { query_string: { query: '*' } },
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
    $scope.queryDocLinks = documentationLinks.query;

    // Create a PersistedState instance.
    $scope.uiState = $state.makeStateful('uiState');
    $scope.appStatus = $appStatus;

    const addToDashMode = $route.current.params[DashboardConstants.ADD_VISUALIZATION_TO_DASHBOARD_MODE_PARAM];
    kbnUrl.removeParam(DashboardConstants.ADD_VISUALIZATION_TO_DASHBOARD_MODE_PARAM);

    $scope.isAddToDashMode = () => addToDashMode;

    // Associate PersistedState instance with the Vis instance, so that
    // `uiStateVal` can be called on it. Currently this is only used to extract
    // map-specific information (e.g. mapZoom, mapCenter).
    vis.setUiState($scope.uiState);


    $scope.timefilter = timefilter;
    $scope.opts = _.pick($scope, 'doSave', 'savedVis', 'shareData', 'timefilter', 'isAddToDashMode');

    stateMonitor = stateMonitorFactory.create($state, stateDefaults);
    stateMonitor.ignoreProps([ 'vis.listeners' ]).onChange((status) => {
      $appStatus.dirty = status.dirty || !savedVis.id;
    });

    $state.replace();

    $scope.getVisualizationTitle = function getVisualizationTitle() {
      return savedVis.lastSavedTitle || `${savedVis.title} (unsaved)`;
    };

    $scope.$watchMulti([
      'searchSource.get("index").timeFieldName',
      'vis.type.options.showTimePicker',
    ], function ([timeField, requiresTimePicker]) {
      timefilter.enabled = Boolean(timeField || requiresTimePicker);
    });

    // update the searchSource when filters update
    $scope.$listen(queryFilter, 'update', function () {
      $state.save();
    });

    // update the searchSource when query updates
    $scope.fetch = function () {
      $state.save();
    };

    $scope.$on('ready:vis', function () {
      $scope.$emit('application.load');
    });

    $scope.$on('$destroy', function () {
      savedVis.destroy();
      stateMonitor.destroy();
    });
  }

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
        notify.info('Saved Visualization "' + savedVis.title + '"');
        if ($scope.isAddToDashMode()) {
          const dashboardBaseUrl = chrome.getNavLinkById('kibana:dashboard');
          // Not using kbnUrl.change here because the dashboardBaseUrl is a full path, not a url suffix.
          // Rather than guess the right substring, we'll just navigate there directly, just as if the user
          // clicked the dashboard link in the UI.
          $window.location.href = `${dashboardBaseUrl.lastSubUrl}&${DashboardConstants.NEW_VISUALIZATION_ID_PARAM}=${savedVis.id}`;
        } else if (savedVis.id === $route.current.params.id) {
          docTitle.change(savedVis.lastSavedTitle);
        } else {
          kbnUrl.change(`${VisualizeConstants.EDIT_PATH}/{{id}}`, { id: savedVis.id });
        }
      }
    }, notify.fatal);
  };

  $scope.unlink = function () {
    if (!$state.linked) return;

    notify.info(`Unlinked Visualization "${savedVis.title}" from Saved Search "${savedVis.savedSearch.title}"`);

    $state.linked = false;
    const parent = searchSource.getParent(true);
    const parentsParent = parent.getParent(true);

    delete savedVis.savedSearchId;
    parent.set('filter', _.union(searchSource.getOwn('filter'), parent.getOwn('filter')));

    // copy over all state except "aggs" and filter, which is already copied
    _(parent.toJSON())
    .omit('aggs')
    .forOwn(function (val, key) {
      searchSource.set(key, val);
    })
    .commit();

    $state.query = searchSource.get('query');
    $state.filters = searchSource.get('filter');
    searchSource.inherits(parentsParent);
  };

  init();
}
