define(function (require) {
  require('plugins/visualize/saved_visualizations/saved_visualizations');
  require('plugins/visualize/editor/sidebar');
  require('plugins/visualize/editor/agg_filter');


  require('directives/saved_object_finder');
  require('components/visualize/visualize');
  require('components/clipboard/clipboard');

  require('filters/uriescape');

  require('routes')
  .when('/visualize/create', {
    template: require('text!plugins/visualize/editor/editor.html'),
    resolve: {
      savedVis: function (savedVisualizations, courier, $route) {
        if (!$route.current.params.indexPattern && !$route.current.params.savedSearchId) {
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
          'index-pattern': '/settings/objects/savedVisualizations/' + $route.current.params.id
        }));
      }
    }
  });

  require('modules')
  .get('app/visualize', [
    'kibana/notify',
    'kibana/courier'
  ])
  .controller('VisEditor', function ($scope, $route, timefilter, AppState, $location, kbnUrl, $timeout, courier) {
    var _ = require('lodash');
    var angular = require('angular');
    var ConfigTemplate = require('utils/config_template');
    var Notifier = require('components/notify/_notifier');

    var notify = new Notifier({
      location: 'Visualization Editor'
    });

    var savedVis = $route.current.locals.savedVis;
    var vis = savedVis.vis;
    var editableVis = vis.clone();
    var searchSource = savedVis.searchSource;

    // config panel templates
    var configTemplate = new ConfigTemplate({
      save: require('text!plugins/visualize/editor/panels/save.html'),
      load: require('text!plugins/visualize/editor/panels/load.html'),
      share: require('text!plugins/visualize/editor/panels/share.html'),
    });

    var $state = (function initState() {
      var savedVisState = vis.getState();
      var stateDefaults = {
        query: searchSource.get('query') || {query_string: {query: '*'}},
        vis: savedVisState
      };

      var $state = new AppState(stateDefaults);

      if (!angular.equals($state.vis, savedVisState)) {
        vis.setState($state.vis);
        editableVis.setState($state.vis);
      }

      return $state;
    }());

    function init() {
      // export some objects
      $scope.savedVis = savedVis;
      $scope.searchSource = searchSource;
      $scope.vis = vis;
      $scope.editableVis = editableVis;
      $scope.state = $state;

      $scope.conf = _.pick($scope, 'doSave', 'savedVis', 'shareData');
      $scope.configTemplate = configTemplate;
      $scope.toggleShare = _.bindKey(configTemplate, 'toggle', 'share');
      $scope.toggleSave = _.bindKey(configTemplate, 'toggle', 'save');
      $scope.toggleLoad = _.bindKey(configTemplate, 'toggle', 'load');

      $scope.linked = !!savedVis.savedSearchId;
      if ($scope.linked) {
        // possibly left over state from unsaved unlinking
        delete $state.query;
      } else {
        $state.query = $state.query || searchSource.get('query');
        courier.setRootSearchSource(searchSource);
        searchSource.set('query', $state.query);
      }

      // track state of editable vis vs. "actual" vis
      $scope.stageEditableVis = transferVisState(editableVis, vis, true);
      $scope.resetEditableVis = transferVisState(vis, editableVis);
      $scope.$watch(function () {
        return editableVis.getState();
      }, function (newState) {
        editableVis.dirty = !angular.equals(newState, vis.getState());
      }, true);

      $scope.$watch('searchSource.get("index").timeFieldName', function (timeField) {
        timefilter.enabled = !!timeField;
      });

      $scope.$listen($state, 'fetch_with_changes', function (keys) {
        if (_.contains(keys, 'vis')) {
          // only update when we need to, otherwise colors change and we
          // risk loosing an in-progress result
          vis.setState($state.vis);
          editableVis.setState($state.vis);
        }

        // we use state to track query, must write before we fetch
        if ($state.query) {
          searchSource.set('query', $state.query);
        } else {
          searchSource.set('query', null);
        }

        $scope.fetch();

      });

      $scope.$listen(timefilter, 'update', _.bindKey($scope, 'fetch'));

      $scope.$on('ready:vis', function () {
        $scope.$emit('application.load');
      });

      $scope.$on('$destroy', function () {
        savedVis.destroy();
      });
    }

    $scope.fetch = function () {
      $state.save();
      if (!$scope.linked) searchSource.set('query', $state.query);
      searchSource.fetch();
    };

    $scope.startOver = function () {
      kbnUrl.change('/visualize', {}, true);
    };

    $scope.doSave = function () {
      savedVis.id = savedVis.title;
      savedVis.visState = $state.vis;

      savedVis.save()
      .then(function () {
        configTemplate.close('save');
        notify.info('Saved Visualization "' + savedVis.title + '"');

        if (savedVis.id === $route.current.params.id) return;

        kbnUrl.change('/visualize/edit/{{id}}', {id: savedVis.id});
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
      var parent = searchSource.getParent(true);
      var parentsParent = parent.getParent(true);

      // display unlinking for 2 seconds, unless it is double clicked
      $scope.unlinking = $timeout($scope.doneUnlinking, 2000);
      delete savedVis.savedSearchId;
      var q = searchSource.get('query');
      $state.query = q;

      var searchState = parent.toJSON();

      // copy over all state except "aggs"
      _(searchState).omit('aggs').forOwn(function (val, key) {
        searchSource.set(key, val);
      });

      searchSource.inherits(parentsParent);
    };

    $scope.doneUnlinking = function () {
      $scope.unlinking = clearTimeout($scope.unlinking);
      $scope.linked = false;
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
