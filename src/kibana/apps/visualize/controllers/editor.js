define(function (require) {
  var _ = require('lodash');
  var ConfigTemplate = require('utils/config_template');
  var typeDefs = require('../saved_visualizations/_type_defs');

  require('../saved_visualizations/saved_visualizations');
  require('notify/notify');

  var app = require('modules').get('app/visualize', [
    'kibana/notify',
    'kibana/courier'
  ]);

  var aggs = require('../saved_visualizations/_aggs');
  var visConfigCategories = require('../saved_visualizations/_config_categories');

  require('routes')
  .when('/visualize/create', {
    template: require('text!../editor.html'),
    resolve: {
      vis: function ($route, savedVisualizations) {
        return savedVisualizations.get($route.current.params);
      }
    }
  })
  .when('/visualize/edit/:id', {
    template: require('text!../editor.html'),
    resolve: {
      vis: function ($route, savedVisualizations) {
        return savedVisualizations.get($route.current.params.id);
      }
    }
  });

  app.controller('VisualizeEditor', function ($route, $scope, courier, createNotifier, config, $location, savedVisualizations) {
    var notify = createNotifier({
      location: 'Visualization Editor'
    });

    // get the vis loaded in from the routes
    var vis = $route.current.locals.vis;

    // get the current field list
    vis.searchSource.getFields()
    .then(function (fieldsHash) {
      // create a sorted list of the fields for display purposes
      $scope.fields = _(fieldsHash)
        .keys()
        .sort()
        .transform(function (fields, name) {
          var field = fieldsHash[name];
          field.name = name;
          fields.push(field);
        })
        .value();

      $scope.fields.byName = fieldsHash;
    });

    $scope.vis = vis;
    $scope.aggs = aggs;
    $scope.visConfigCategories = visConfigCategories;

    /**
     * (Re)set the aggs key on the vis.searchSource based on the
     * current config
     */
    var updateDataSource = function () {
      notify.event('update data source');

      // stores the config objects in queryDsl
      var dsl = {};
      // counter to ensure unique agg names
      var i = 0;
      // start at the root, but the current will move
      var current = dsl;

      // continue to nest the aggs under each other
      // writes to the dsl object
      vis.getConfig().forEach(function (config) {
        current.aggs = {};
        var key = '_agg_' + (i++);

        var aggDsl = {};
        aggDsl[config.agg] = config.aggParams;

        current = current.aggs[key] = aggDsl;
      });

      // set the dsl to the searchSource
      vis.searchSource.aggs(dsl.aggs || {});
      notify.event('update data source', true);
    };

    /**
     * Refresh Visualization
     */
    $scope.doVisualize = function () {
      updateDataSource();
      vis.searchSource.fetch();
    };

    /**
     * Restart on a new visualization
     */
    $scope.startOver = function () {
      $location.url('/visualize');
    };

    /**
     * Save the current vis state
     */
    $scope.doSave = function () {
      updateDataSource();

      // serialize the current state
      vis.stateJSON = JSON.stringify(vis.getState());

      vis.save()
      .then(function () {
        $location.url('/visualize/edit/' + vis.id);
        configTemplate.close('save');
      }, notify.fatal);
    };

    // templates that can be used in the config panel
    var configTemplate = $scope.configTemplate = new ConfigTemplate({
      save: require('text!../partials/save.html'),
      load: require('text!../partials/load.html')
    });

    /**
     * Toggle the save config panel
     */
    $scope.toggleSave = function () {
      configTemplate.toggle('save');
    };

    // stash for vars related to loading a vis
    var loadVis = $scope.loadVis = {
      filter: '',
      list: [],
      setList: function (hits) {
        $scope.loadVis.list = hits.filter(function (hit) {
          return hit.id !== $scope.vis.id;
        });
      }
    };

    /**
     * Toggle the load config panel
     */
    $scope.toggleLoad = function () {
      configTemplate.toggle('load') && savedVisualizations.find().then(loadVis.setList);
    };

    // when the filter changes, load in the new vis objects
    $scope.$watch('loadVis.filter', function () {
      savedVisualizations.find(loadVis.filter).then(loadVis.setList);
    });

    // objects to make available within the config panel's scope
    $scope.conf = _.pick($scope, 'doSave', 'doLoad', 'loadVis', 'vis');
  });
});