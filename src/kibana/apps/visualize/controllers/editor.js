define(function (require) {
  var _ = require('lodash');

  require('../saved_visualizations/saved_visualizations');
  require('notify/notify');

  var app = require('modules').get('app/visualize', [
    'kibana/notify',
    'kibana/courier'
  ]);

  var aggs = require('../saved_visualizations/_aggs');
  var visConfigCategories = require('../saved_visualizations/_config_categories');

  app.controller('VisualizeEditor', function ($route, $scope, courier, createNotifier, config, $location) {
    var notify = createNotifier({
      location: 'Visualization Editor'
    });

    var vis = $route.current.locals.vis;

    $scope.refreshFields = function () {
      $scope.fields = null;
      vis.searchSource.clearFieldCache().then(getFields, notify.error);
    };

    function getFields() {
      return vis.searchSource.getFields()
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
    }

    getFields();

    $scope.vis = vis;
    $scope.aggs = aggs;
    $scope.visConfigCategories = visConfigCategories;

    $scope.$on('change:config.defaultIndex', function () {
      if (!vis.searchSource.get('index')) {
        vis.searchSource.index(config.get('defaultIndex'));
        getFields();
      }
    });

    var updateDataSource = function () {
      notify.event('update data source');

      var config = vis.getConfig();

      config = _.groupBy(config, function (config) {
        switch (config.categoryName) {
        case 'group':
        case 'segment':
          return 'dimension';
        default:
          return config.categoryName;
        }
      });

      if (!config.dimension) {
        // use the global aggregation if we don't have any dimensions
        config.dimension = [{
          agg: 'global',
          aggParams: {}
        }];
      }

      var dsl = {};
      var i = 0;

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

      config.split && config.split.forEach(nest);
      config.dimension && config.dimension.forEach(nest);
      config.metric && config.metric.forEach(nest);

      notify.log('config', config);
      notify.log('aggs', dsl.aggs);

      vis.searchSource.aggs(dsl.aggs);
      notify.event('update data source', true);
    };

    /*********
     *** BUTTON EVENT HANDLERS
     *********/
    $scope.doVisualize = function () {
      updateDataSource();
      vis.searchSource.fetch();
    };
    $scope.doSave = function () {
      updateDataSource();
      vis.save()
      .then(function () {
        $location.url('/visualize/' + vis.typeName + '/' + vis.get('id'));
      }, notify.fatal);
    };

  });
});