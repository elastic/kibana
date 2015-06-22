define(function (require) {
  var _ = require('lodash');
  require('plugins/visualize/saved_visualizations/saved_visualizations');
  require('plugins/visualize/editor/sidebar');
  require('plugins/visualize/editor/agg_filter');


  require('directives/saved_object_finder');
  require('components/visualize/visualize');
  require('components/clipboard/clipboard');
  require('components/comma_list_filter');

  require('filters/uriescape');

  require('routes')
  .when('/visualize/create', {
    template: require('text!plugins/visualize/editor/editor.html'),
    resolve: {
      savedVis: function (savedVisualizations, courier, $route, Private) {
        var visTypes = Private(require('registry/vis_types'));
        var visType = _.find(visTypes, {name: $route.current.params.type});
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
    template: require('text!plugins/visualize/editor/editor.html'),
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

  require('modules')
  .get('app/visualize', [
    'kibana/notify',
    'kibana/courier'
  ])
  .controller('VisEditor', function ($scope, $route, timefilter, AppState, $location, kbnUrl, $timeout, courier, Private, Promise) {

    var _ = require('lodash');
    var angular = require('angular');
    var ConfigTemplate = require('utils/config_template');
    var Notifier = require('components/notify/_notifier');
    var docTitle = Private(require('components/doc_title/doc_title'));
    var brushEvent = Private(require('utils/brush_event'));
    var queryFilter = Private(require('components/filter_bar/query_filter'));
    var filterBarClickHandler = Private(require('components/filter_bar/filter_bar_click_handler'));

    var notify = new Notifier({
      location: 'Visualization Editor'
    });

    var savedVis = $route.current.locals.savedVis;

    var vis = savedVis.vis;
    var editableVis = vis.createEditableVis();
    vis.requesting = function () {
      var requesting = editableVis.requesting;
      requesting.call(vis);
      requesting.call(editableVis);
    };

    var searchSource = savedVis.searchSource;

    // config panel templates
    var configTemplate = new ConfigTemplate({
      save: require('text!plugins/visualize/editor/panels/save.html'),
      load: require('text!plugins/visualize/editor/panels/load.html'),
      share: require('text!plugins/visualize/editor/panels/share.html')
    });

    if (savedVis.id) {
      docTitle.change(savedVis.title);
    }

    var $state = $scope.$state = (function initState() {
      var savedVisState = vis.getState();
      var stateDefaults = {
        linked: !!savedVis.savedSearchId,
        query: searchSource.getOwn('query') || {query_string: {query: '*'}},
        filters: searchSource.getOwn('filter') || [],
        vis: savedVisState
      };

      var $state = new AppState(stateDefaults);

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
      $scope.conf = _.pick($scope, 'doSave', 'savedVis', 'shareData');
      $scope.configTemplate = configTemplate;

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
            return _.deepGet(agg, 'schema.group') === 'metrics' && _.deepGet(agg, 'type.supportsOrderBy');
          });
        } catch (e) {
          // this can fail when the agg.type is changed but the
          // params have not been set yet. watcher will trigger again
          // when the params update
        }
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

      savedVis.save()
      .then(function (id) {
        configTemplate.close('save');

        if (id) {
          notify.info('Saved Visualization "' + savedVis.title + '"');
          if (savedVis.id === $route.current.params.id) return;
          kbnUrl.change('/visualize/edit/{{id}}', {id: savedVis.id});
        }
      }, notify.fatal);
    };

    $scope.shareData = function () {
      return {
        link: $location.absUrl(),
        // This sucks, but seems like the cleanest way. Uhg.
        embed: '<iframe src="' + $location.absUrl().replace('?', '?embed&') +
          '" height="600" width="800"></iframe>'
      };
    };

    $scope.unlink = function () {
      if (!$state.linked) return;

      $state.linked = false;
      var parent = searchSource.getParent(true);
      var parentsParent = parent.getParent(true);

      // display unlinking for 2 seconds, unless it is double clicked
      $scope.unlinking = $timeout($scope.clearUnlinking, 2000);

      delete savedVis.savedSearchId;
      parent.set('filter', _.union(searchSource.getOwn('filter'), parent.getOwn('filter')));

      // copy over all state except "aggs" and filter, which is already copied
      _(parent.toJSON()).omit('aggs').forOwn(function (val, key) {
        searchSource.set(key, val);
      });

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
  });
});
