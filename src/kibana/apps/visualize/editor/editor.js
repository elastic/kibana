define(function (require) {
  require('apps/visualize/saved_visualizations/saved_visualizations');
  require('apps/visualize/editor/sidebar');
  require('apps/visualize/editor/agg_filter');

  require('directives/saved_object_finder');
  require('components/visualize/visualize');
  require('filters/uriescape');

  require('routes')
  .when('/visualize/create', {
    template: require('text!apps/visualize/editor/editor.html'),
    resolve: {
      savedVis: function (savedVisualizations, courier, $route) {
        if (!$route.current.params.indexPattern && !$route.current.params.savedSearchId) {
          throw new Error('You must provide either an indexPattern or a savedSearchId');
        }

        return savedVisualizations.get($route.current.params)
        .catch(courier.redirectWhenMissing({
          //'index-pattern': '/visualize',
          '*': '/visualize'
        }));
      }
    }
  })
  .when('/visualize/edit/:id', {
    template: require('text!apps/visualize/editor/editor.html'),
    resolve: {
      savedVis: function (savedVisualizations, courier, $route) {
        return savedVisualizations.get($route.current.params.id)
        .catch(courier.redirectWhenMissing({
          'index-pattern': '/settings',
          '*': '/visualize'
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
      save: require('text!apps/visualize/editor/panels/save.html'),
      load: require('text!apps/visualize/editor/panels/load.html'),
      share: require('text!apps/visualize/editor/panels/share.html'),
    });

    var $state = (function initState() {
      var savedVisState = vis.getState();

      var $state = new AppState({
        vis: savedVisState
      });

      if (!angular.equals($state.vis, savedVisState)) {
        vis.setState($state.vis);
        editableVis.setState($state.vis);
      }

      return $state;
    }());

    function init() {
      // export some objects
      $scope.savedVis = savedVis;
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
      $scope.stageEditableVis = transferVisState(editableVis, vis);
      $scope.resetEditableVis = transferVisState(vis, editableVis);
      $scope.$watch(function () {
        return editableVis.getState();
      }, function (newState) {
        editableVis.dirty = !angular.equals(newState, vis.getState());
      }, true);

      $scope.$listen($state, 'fetch_with_changes', function () {

        vis.setState($state.vis);
        editableVis.setState($state.vis);

        // we use state to track query, must write before we fetch
        if ($state.query) {
          searchSource.set('query', $state.query);
        } else {
          searchSource.set('query', null);
        }

        $scope.fetch();

      });

      timefilter.enabled = true;
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
        embed: $location.absUrl().replace('?', '?embed&')
      };
    };

    $scope.unlink = function () {
      return searchSource.getParent(true)
      .then(function (parent) {

        return parent.getParent(true)
        .then(function (parentsParent) {
          // parentsParent can be undefined


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
          courier.setRootSearchSource(searchSource);
        });
      }).catch(notify.fatal);
    };

    $scope.doneUnlinking = function () {
      $scope.unlinking = clearTimeout($scope.unlinking);
      $scope.linked = false;
    };

    function transferVisState(fromVis, toVis) {
      return function () {
        toVis.setState(fromVis.getState());
        editableVis.dirty = false;
        $state.vis = vis.getState();
        $state.save();
      };
    }

    init();
  });
});
