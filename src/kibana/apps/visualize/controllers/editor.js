define(function (require) {
  var _ = require('lodash');
  var ConfigTemplate = require('utils/config_template');

  require('../saved_visualizations/saved_visualizations');
  require('notify/notify');

  var app = require('modules').get('app/visualize', [
    'kibana/notify',
    'kibana/courier'
  ]);

  var aggs = require('../saved_visualizations/_aggs');
  var visConfigCategories = require('../saved_visualizations/_config_categories');

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

      // get the config objects form the visualization
      var config = vis.getConfig();

      // group the segments by their categoryName, but merge the segments and groups
      config = _.groupBy(config, function (config) {
        switch (config.categoryName) {
        case 'group':
        case 'segment':
          return 'dimension';
        default:
          return config.categoryName;
        }
      });

      // use the global aggregation if we don't have any dimensions
      if (!config.dimension) {
        config.dimension = [{
          agg: 'global',
          aggParams: {}
        }];
      }

      // stores the config objects in queryDsl
      var dsl = {};
      // counter to ensure unique agg names
      var i = 0;

      // continue to nest the aggs under each other
      // writes to the dsl object
      var nest = (function () {
        var current = dsl;
        return function (config) {
          current.aggs = {};
          var key = '_agg_' + (i++);

          var aggDsl = {};
          aggDsl[config.agg] = config.aggParams;

          current = current.aggs[key] = aggDsl;
        };
      }());

      // nest each config type in order
      config.split && config.split.forEach(nest);
      config.dimension && config.dimension.forEach(nest);
      config.metric && config.metric.forEach(nest);

      // set the dsl to the searchSource
      vis.searchSource.aggs(dsl.aggs);
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
      vis.save()
      .then(function () {
        $location.url('/visualize/' + vis.typeName + '/' + vis.id);
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