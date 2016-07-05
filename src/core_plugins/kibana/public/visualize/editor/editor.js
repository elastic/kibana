import _ from 'lodash';
import 'plugins/kibana/visualize/saved_visualizations/saved_visualizations';
import 'plugins/kibana/visualize/editor/sidebar';
import 'plugins/kibana/visualize/editor/agg_filter';
import 'ui/visualize';
import 'ui/collapsible_sidebar';
import 'ui/share';
import angular from 'angular';
import Notifier from 'ui/notify/notifier';
import RegistryVisTypesProvider from 'ui/registry/vis_types';
import DocTitleProvider from 'ui/doc_title';
import UtilsBrushEventProvider from 'ui/utils/brush_event';
import FilterBarQueryFilterProvider from 'ui/filter_bar/query_filter';
import FilterBarFilterBarClickHandlerProvider from 'ui/filter_bar/filter_bar_click_handler';
import uiRoutes from 'ui/routes';
import uiModules from 'ui/modules';
import editorTemplate from 'plugins/kibana/visualize/editor/editor.html';


uiRoutes
.when('/visualize/create', {
  template: editorTemplate,
  resolve: {
    savedVis: function (savedVisualizations, courier, $route, Private) {
      const visTypes = Private(RegistryVisTypesProvider);
      const visType = _.find(visTypes, {name: $route.current.params.type});
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
.when('/visualize/edit/:id', {
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
.controller('VisEditor', function ($scope, $route, timefilter, AppState, $location, kbnUrl, $timeout, courier, Private, Promise) {

  const docTitle = Private(DocTitleProvider);
  const brushEvent = Private(UtilsBrushEventProvider);
  const queryFilter = Private(FilterBarQueryFilterProvider);
  const filterBarClickHandler = Private(FilterBarFilterBarClickHandlerProvider);

  const notify = new Notifier({
    location: 'Visualization Editor'
  });

  const savedVis = $route.current.locals.savedVis;

  const vis = savedVis.vis;
  const editableVis = vis.createEditableVis();
  vis.requesting = function () {
    const requesting = editableVis.requesting;
    requesting.call(vis);
    requesting.call(editableVis);
  };

  const searchSource = savedVis.searchSource;

  $scope.topNavMenu = [{
    key: 'new',
    description: 'New Visualization',
    run: function () { kbnUrl.change('/visualize', {}); }
  }, {
    key: 'save',
    template: require('plugins/kibana/visualize/editor/panels/save.html'),
    description: 'Save Visualization'
  }, {
    key: 'load',
    template: require('plugins/kibana/visualize/editor/panels/load.html'),
    description: 'Load Saved Visualization',
  }, {
    key: 'share',
    template: require('plugins/kibana/visualize/editor/panels/share.html'),
    description: 'Share Visualization'
  }, {
    key: 'refresh',
    description: 'Refresh',
    run: function () { $scope.fetch(); }
  }];

  if (savedVis.id) {
    docTitle.change(savedVis.title);
  }

  let $state = $scope.$state = (function initState() {
    const savedVisState = vis.getState();
    const stateDefaults = {
      uiState: savedVis.uiStateJSON ? JSON.parse(savedVis.uiStateJSON) : {},
      linked: !!savedVis.savedSearchId,
      query: searchSource.getOwn('query') || {query_string: {query: '*'}},
      filters: searchSource.getOwn('filter') || [],
      vis: savedVisState
    };

    $state = new AppState(stateDefaults);

    if (!angular.equals($state.vis, savedVisState)) {
      Promise.try(function () {
        editableVis.setState($state.vis);
        vis.setState(editableVis.getEnabledState());
      })
      .catch(courier.redirectWhenMissing({
        'index-pattern-field': '/visualize'
      }));
    }

    return $state;
  }());

  function init() {
    // export some objects
    $scope.savedVis = savedVis;
    $scope.searchSource = searchSource;
    $scope.vis = vis;
    $scope.indexPattern = vis.indexPattern;
    $scope.editableVis = editableVis;
    $scope.state = $state;
    $scope.uiState = $state.makeStateful('uiState');
    vis.setUiState($scope.uiState);
    $scope.timefilter = timefilter;
    $scope.opts = _.pick($scope, 'doSave', 'savedVis', 'shareData', 'timefilter');

    editableVis.listeners.click = vis.listeners.click = filterBarClickHandler($state);
    editableVis.listeners.brush = vis.listeners.brush = brushEvent;

    // track state of editable vis vs. "actual" vis
    $scope.stageEditableVis = transferVisState(editableVis, vis, true);
    $scope.resetEditableVis = transferVisState(vis, editableVis);
    $scope.$watch(function () {
      return editableVis.getEnabledState();
    }, function (newState) {
      editableVis.dirty = !angular.equals(newState, vis.getEnabledState());

      $scope.responseValueAggs = null;
      try {
        $scope.responseValueAggs = editableVis.aggs.getResponseAggs().filter(function (agg) {
          return _.get(agg, 'schema.group') === 'metrics';
        });
      }
      // this can fail when the agg.type is changed but the
      // params have not been set yet. watcher will trigger again
      // when the params update
      catch (e) {} // eslint-disable-line no-empty
    }, true);

    $state.replace();

    $scope.$watch('searchSource.get("index").timeFieldName', function (timeField) {
      timefilter.enabled = !!timeField;
    });

    // update the searchSource when filters update
    $scope.$listen(queryFilter, 'update', function () {
      searchSource.set('filter', queryFilter.getFilters());
      $state.save();
    });

    // fetch data when filters fire fetch event
    $scope.$listen(queryFilter, 'fetch', $scope.fetch);


    $scope.$listen($state, 'fetch_with_changes', function (keys) {
      if (_.contains(keys, 'linked') && $state.linked === true) {
        // abort and reload route
        $route.reload();
        return;
      }

      if (_.contains(keys, 'vis')) {
        $state.vis.listeners = _.defaults($state.vis.listeners || {}, vis.listeners);

        // only update when we need to, otherwise colors change and we
        // risk loosing an in-progress result
        vis.setState($state.vis);
        editableVis.setState($state.vis);
      }

      // we use state to track query, must write before we fetch
      if ($state.query && !$state.linked) {
        searchSource.set('query', $state.query);
      } else {
        searchSource.set('query', null);
      }

      if (_.isEqual(keys, ['filters'])) {
        // updates will happen in filter watcher if needed
        return;
      }

      $scope.fetch();
    });

    // Without this manual emission, we'd miss filters and queries that were on the $state initially
    $state.emit('fetch_with_changes');

    $scope.$listen(timefilter, 'fetch', _.bindKey($scope, 'fetch'));

    $scope.$on('ready:vis', function () {
      $scope.$emit('application.load');
    });

    $scope.$on('$destroy', function () {
      savedVis.destroy();
    });
  }

  $scope.fetch = function () {
    $state.save();
    searchSource.set('filter', queryFilter.getFilters());
    if (!$state.linked) searchSource.set('query', $state.query);
    if ($scope.vis.type.requiresSearch) {
      courier.fetch();
    }
  };

  $scope.startOver = function () {
    kbnUrl.change('/visualize', {});
  };

  $scope.doSave = function () {
    savedVis.id = savedVis.title;
    // vis.title was not bound and it's needed to reflect title into visState
    $state.vis.title = savedVis.title;
    savedVis.visState = $state.vis;
    savedVis.uiStateJSON = angular.toJson($scope.uiState.getChanges());

    savedVis.save()
    .then(function (id) {
      $scope.kbnTopNav.close('save');

      if (id) {
        notify.info('Saved Visualization "' + savedVis.title + '"');
        if (savedVis.id === $route.current.params.id) return;
        kbnUrl.change('/visualize/edit/{{id}}', {id: savedVis.id});
      }
    }, notify.fatal);
  };

  $scope.unlink = function () {
    if (!$state.linked) return;

    $state.linked = false;
    const parent = searchSource.getParent(true);
    const parentsParent = parent.getParent(true);

    // display unlinking for 2 seconds, unless it is double clicked
    $scope.unlinking = $timeout($scope.clearUnlinking, 2000);

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

  $scope.clearUnlinking = function () {
    if ($scope.unlinking) {
      $timeout.cancel($scope.unlinking);
      $scope.unlinking = null;
    }
  };

  function transferVisState(fromVis, toVis, stage) {
    return function () {
      const view = fromVis.getEnabledState();
      const full = fromVis.getState();
      toVis.setState(view);
      editableVis.dirty = false;
      $state.vis = full;
      $state.save();

      if (stage) $scope.fetch();
    };
  }

  init();
});
