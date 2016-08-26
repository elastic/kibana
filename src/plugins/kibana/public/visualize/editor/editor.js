define(function (require) {
  const _ = require('lodash');
  require('plugins/kibana/visualize/saved_visualizations/saved_visualizations');
  require('plugins/kibana/visualize/editor/sidebar');
  require('plugins/kibana/visualize/editor/agg_filter');

  const stateMonitorFactory = require('ui/state_management/state_monitor_factory');
  require('ui/navbar_extensions');
  require('ui/visualize');
  require('ui/collapsible_sidebar');
  require('ui/share');

  require('ui/routes')
  .when('/visualize/create', {
    template: require('plugins/kibana/visualize/editor/editor.html'),
    resolve: {
      savedVis: function (savedVisualizations, courier, $route, Private) {
        const visTypes = Private(require('ui/registry/vis_types'));
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
    template: require('plugins/kibana/visualize/editor/editor.html'),
    resolve: {
      savedVis: function (savedVisualizations, courier, $route) {
        return savedVisualizations.get($route.current.params.id)
        .catch(courier.redirectWhenMissing({
          'visualization': '/visualize',
          'search': '/settings/objects/savedVisualizations/' + $route.current.params.id,
          'index-pattern': '/settings/objects/savedVisualizations/' + $route.current.params.id,
          'index-pattern-field': '/settings/objects/savedVisualizations/' + $route.current.params.id
        }));
      }
    }
  });

  require('ui/modules')
  .get('app/visualize', [
    'kibana/notify',
    'kibana/courier'
  ])
  .directive('visualizeApp', function () {
    return {
      controllerAs: 'visualizeApp',
      controller: VisEditor,
    };
  });

  function VisEditor($scope, $route, timefilter, AppState, $location, kbnUrl, $timeout, courier, Private, Promise) {
    const angular = require('angular');
    const ConfigTemplate = require('ui/ConfigTemplate');
    const Notifier = require('ui/notify/notifier');
    const docTitle = Private(require('ui/doc_title'));
    const brushEvent = Private(require('ui/utils/brush_event'));
    const queryFilter = Private(require('ui/filter_bar/query_filter'));
    const filterBarClickHandler = Private(require('ui/filter_bar/filter_bar_click_handler'));

    const notify = new Notifier({
      location: 'Visualization Editor'
    });

    let stateMonitor;
    const $appStatus = this.appStatus = {};

    const savedVis = $route.current.locals.savedVis;

    const vis = savedVis.vis;
    const editableVis = vis.createEditableVis();
    vis.requesting = function () {
      const requesting = editableVis.requesting;
      requesting.call(vis);
      requesting.call(editableVis);
    };

    const searchSource = savedVis.searchSource;

    // config panel templates
    const configTemplate = new ConfigTemplate({
      save: require('plugins/kibana/visualize/editor/panels/save.html'),
      load: require('plugins/kibana/visualize/editor/panels/load.html'),
      share: require('plugins/kibana/visualize/editor/panels/share.html'),
    });

    if (savedVis.id) {
      docTitle.change(savedVis.title);
    }

    const savedVisState = vis.getState();
    const stateDefaults = {
      uiState: savedVis.uiStateJSON ? JSON.parse(savedVis.uiStateJSON) : {},
      linked: !!savedVis.savedSearchId,
      query: searchSource.getOwn('query') || {query_string: {query: '*'}},
      filters: searchSource.getOwn('filter') || [],
      vis: savedVisState
    };

    let $state = $scope.$state = (function initState() {
      $state = new AppState(stateDefaults);

      if (!angular.equals($state.vis, savedVisState)) {
        Promise.try(function () {
          vis.setState($state.vis);
          editableVis.setState($state.vis);
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
      $scope.appStatus = $appStatus;

      $scope.conf = _.pick($scope, 'doSave', 'savedVis', 'shareData');
      $scope.configTemplate = configTemplate;

      stateMonitor = stateMonitorFactory.create($state, stateDefaults);
      stateMonitor.ignoreProps([ 'vis.listeners' ]).onChange((status) => {
        $appStatus.dirty = status.dirty;
      });
      $scope.$on('$destroy', () => stateMonitor.destroy());

      editableVis.listeners.click = vis.listeners.click = filterBarClickHandler($state);
      editableVis.listeners.brush = vis.listeners.brush = brushEvent;

      // track state of editable vis vs. "actual" vis
      $scope.stageEditableVis = transferVisState(editableVis, vis, true);
      $scope.resetEditableVis = transferVisState(vis, editableVis);
      $scope.$watch(function () {
        return editableVis.getState();
      }, function (newState) {
        editableVis.dirty = !angular.equals(newState, vis.getState());

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
      savedVis.visState = $state.vis;
      savedVis.uiStateJSON = angular.toJson($scope.uiState.getChanges());

      savedVis.save()
      .then(function (id) {
        stateMonitor.setInitialState($state.toJSON());
        configTemplate.close('save');

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

    function transferVisState(fromVis, toVis, fetch) {
      return function () {
        toVis.setState(fromVis.getState());
        editableVis.dirty = false;
        $state.vis = vis.getState();
        $state.save();

        if (fetch) $scope.fetch();
      };
    }

    init();
  }
});
