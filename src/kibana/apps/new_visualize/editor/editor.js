define(function (require) {
  require('apps/visualize/saved_visualizations/saved_visualizations');
  require('directives/saved_object_finder');
  require('apps/visualize/editor/agg_group');
  require('components/visualize/visualize');
  require('filters/uriescape');

  require('routes')
  .when('/new_visualize/create', {
    template: require('text!apps/visualize/editor/editor.html'),
    resolve: {
      savedVis: function (savedVisualizations, courier, $route) {
        if (!$route.current.params.indexPattern && !$route.current.params.savedSearchId) {
          throw new Error('You must provide either an indexPattern or a savedSearchId');
        }

        return savedVisualizations.get($route.current.params)
        .catch(courier.redirectWhenMissing({
          //'index-pattern': '/visualize',
          '*': '/new_visualize'
        }));
      }
    }
  })
  .when('/new_visualize/edit/:id', {
    template: require('text!apps/visualize/editor/editor.html'),
    resolve: {
      savedVis: function (savedVisualizations, courier, $route) {
        return savedVisualizations.get($route.current.params.id)
        .catch(courier.redirectWhenMissing({
          'index-pattern': '/settings',
          '*': '/new_visualize'
        }));
      }
    }
  });

  require('modules')
  .get('apps/visualize', [
    'kibana/notify',
    'kibana/courier'
  ])
  .controller('VisEditor', function ($scope, $route, timefilter, appStateFactory, $location, globalState, $timeout) {
    var _ = require('lodash');
    var angular = require('angular');
    var ConfigTemplate = require('utils/config_template');
    var Notifier = require('components/notify/_notifier');

    var notify = new Notifier({
      location: 'Visualization Editor'
    });

    var savedVis = $route.current.locals.savedVis;
    var vis = savedVis.vis;
    var searchSource = savedVis.searchSource;

    // config panel templates
    var configTemplate = new ConfigTemplate({
      save: require('text!apps/visualize/editor/panels/save.html'),
      load: require('text!apps/visualize/editor/panels/load.html'),
      share: require('text!apps/visualize/editor/panels/share.html'),
    });

    function init() {
      // export some objects
      $scope.savedVis = savedVis;
      $scope.vis = vis;
      $scope.state = $state;

      $scope.conf = _.pick($scope, 'doSave', 'vis', 'shareData');
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
        searchSource.set('query', $state.query);
      }

      $scope.$on('ready:vis', function () {
        $scope.$emit('application.load');
      });
    }

    var $state = appStateFactory.create({
      vis: vis.getState()
    });

    $state.on('fetch_with_changes', function () {
      vis.setState($state.vis);

      // we use state to track query, must write before we fetch
      if ($state.query) {
        searchSource.set('query', $state.query);
      } else {
        searchSource.set('query', null);
      }

      $scope.fetch();
    });

    $scope.$watch(_.bindKey(vis, 'getState'), function (newState) {
      $state.vis = newState;
      $scope.stateDirty = true;
    }, true);

    timefilter.enabled = true;
    timefilter.on('update', _.bindKey($scope, 'fetch'));

    $scope.fetch = function () {
      $state.save();
      searchSource.fetch();
    };

    $scope.startOver = function () {
      $location.url('/visualize');
    };

    $scope.doSave = function () {
      savedVis.id = savedVis.title;
      savedVis.visState = $state.vis;

      savedVis.save()
      .then(function () {
        configTemplate.close('save');
        notify.info('Saved Data Source "' + savedVis.title + '"');

        if (savedVis.id === $route.current.params.id) return;

        $location.url(
          globalState.writeToUrl(
            '/visualize/edit/' + encodeURIComponent(savedVis.id)
          )
        );
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
      // display unlinking for 2 seconds, unless it is double clicked
      $scope.unlinking = $timeout($scope.doneUnlinking, 2000);

      delete savedVis.savedSearchId;

      var q = searchSource.get('query');
      $state.query = q;

      var parent = searchSource.parent();
      // we will copy over all state minus the "aggs"
      _(parent.toJSON()).omit('aggs').forOwn(function (val, key) {
        searchSource.set(key, val);
      });

      searchSource.inherits(parent.parent());
    };

    $scope.doneUnlinking = function () {
      $scope.unlinking = clearTimeout($scope.unlinking);
      $scope.linked = false;
    };

    $scope.$on('$destroy', function () {
      savedVis.destroy();
    });

    init();
  });
});
