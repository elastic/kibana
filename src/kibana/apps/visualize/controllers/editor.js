define(function (require) {
  var _ = require('lodash');
  var angular = require('angular');
  var ConfigTemplate = require('utils/config_template');
  var typeDefs = require('../saved_visualizations/_type_defs');

  require('../saved_visualizations/saved_visualizations');
  require('notify/notify');
  require('filters/uriescape');

  var app = require('modules').get('app/visualize', [
    'kibana/notify',
    'kibana/courier'
  ]);

  var visConfigCategories = require('../saved_visualizations/_config_categories');

  require('routes')
  .when('/visualize/create', {
    template: require('text!../editor.html'),
    resolve: {
      vis: function (savedVisualizations, courier, $route) {
        return savedVisualizations.get($route.current.params)
        .catch(courier.redirectWhenMissing({
          'index-pattern': '/settings',
          '*': '/visualize'
        }));
      }
    }
  })
  .when('/visualize/edit/:id', {
    template: require('text!../editor.html'),
    resolve: {
      vis: function (savedVisualizations, courier, $route) {
        return savedVisualizations.get($route.current.params.id)
        .catch(courier.redirectWhenMissing({
          'index-pattern': '/settings',
          '*': '/visualize'
        }));
      }
    }
  });

  app.controller('VisualizeEditor', function ($scope, $route, $timeout, Notifier, $location, globalState, AppState, timefilter, Private) {
    var aggs = Private(require('../saved_visualizations/_aggs'));

    var notify = new Notifier({
      location: 'Visualization Editor'
    });

    // get the vis loaded in from the routes
    var vis = $route.current.locals.vis;
    // vis.destroy called by visualize directive

    var indexPattern = vis.searchSource.get('index');

    $scope.fields = _.sortBy(indexPattern.fields, 'name');
    $scope.fields.byName = indexPattern.fieldsByName;

    var $state = $scope.state = new AppState(vis.getState());

    $scope.vis = vis;

    $scope.aggs = aggs;
    $scope.visConfigCategories = visConfigCategories;

    var visConfigProperties = Object.keys(visConfigCategories.byName);

    var init = function () {
      $scope.$on('ready:vis', function () {
        // once the visualization is ready, boot up
        vis.setState($state);
        $scope.$emit('application.load');
      });
    };

    /**
     * YOU PROBABLY WANT write|readStateAndFetch
     */
    var justFetch = function () {
      // we use state to track query, must write before we fetch
      if ($state.query) {
        vis.searchSource.set('query', $state.query);
      } else {
        vis.searchSource.set('query', false);
      }
      vis.searchSource.fetch();
    };

    /**
     * Write the latest changes made on the visualization to the $state. This
     * will cause a fetch if there were changes
     *
     * @return {Array} - a list of the keys from state that were updated.
     */
    var writeStateAndFetch = function () {
      _.assign($state, vis.getState());
      $state.commit();
      justFetch();
    };

    /**
     * Pull the state into the vis, and then fetch the searchSource
     * @return {undefined}
     */
    var readStateAndFetch = function () {
      // update and commit the state, which will update the vis dataSource if there were new changes
      vis.setState($state);
      justFetch();
    };

    /**
     * When something else updates the state, let us know
     */
    $state.onUpdate(readStateAndFetch);

    /**
     * Click handler for the "refresh" button
     */
    $scope.doVisualize = writeStateAndFetch;

    /**
     * Click handler for the "new doc" button
     */
    $scope.startOver = function () {
      $location.url('/visualize');
    };

    /**
     * Do that actual save, click handler for the "save" button within the save config panel
     */
    $scope.doSave = function () {
      writeStateAndFetch();

      // use the title for the id
      vis.id = vis.title;

      // serialize the current state
      vis.stateJSON = JSON.stringify(vis.getState());

      vis.save()
      .then(function () {
        if (vis.id !== $route.current.params.id) {
          $location.url(globalState.writeToUrl('/visualize/edit/' + vis.id));
        }
        configTemplate.close('save');
      }, notify.fatal);
    };


    /**
     * Enable the timefilter, and tell Angular to
     */
    timefilter.enabled(true);
    $scope.timefilter = timefilter;
    // TODO: Switch this to watching time.string when we implement it
    $scope.$watchCollection('timefilter.time', function (newTime, oldTime) {
      // don't fetch unless there was a previous value and the values are not loosly equal
      if (!_.isUndefined(oldTime) && !angular.equals(newTime, oldTime)) $scope.doVisualize();
    });

    // config panel templates
    var configTemplate = $scope.configTemplate = new ConfigTemplate({
      save: require('text!../partials/save.html'),
      load: require('text!../partials/load.html')
    });

    /**
     * Click handler for the "save" button.
     */
    $scope.toggleSave = _.bindKey(configTemplate, 'toggle', 'save');

    /**
     * Toggle the load config panel
     */
    $scope.toggleLoad = _.bindKey(configTemplate, 'toggle', 'load');

    // objects to make available within the config panel's scope
    $scope.conf = _.pick($scope, 'doSave', 'vis');

    $scope.unlink = function () {
      // display unlinking for 2 seconds, unless it is double clicked
      $scope.unlinking = $timeout($scope.doneUnlinking, 2000);

      delete vis.savedSearchId;

      $state.query = vis.searchSource.get('query');

      var parent = vis.searchSource.parent();
      vis.searchSource.set(parent.toJSON());
      vis.searchSource.inherits(parent.parent());
    };
    $scope.doneUnlinking = function () {
      $scope.unlinking = clearTimeout($scope.unlinking);
      $scope.linked = false;
    };

    $scope.linked = !!vis.savedSearchId;
    if ($scope.linked) {
      // possibly left over state from unsaved unlinking
      delete $state.query;
    } else {
      var q = vis.searchSource.get('query');
      if (_.isObject(q)) {
        $state.query = q.query_string.query;
      } else {
        $state.query = q;
      }
    }

    // init
    init();
  });

});