define(function (require) {
  var _ = require('lodash');
  var app = require('modules').get('app/visualize');

  require('../factories/vis');
  require('../services/aggs');

  app.controller('Visualize', function ($scope, courier, createNotifier, Vis, Aggs) {
    var notify = createNotifier({
      location: 'Visualize Controller'
    });

    // the object detailing the visualization
    var vis = $scope.vis = window.vis = new Vis({
      metric: {
        label: 'Y-Axis',
        min: 1,
        max: 1
      },
      segment: {
        label: 'X-Axis',
        min: 1,
        max: 1
      },
      group: {
        label: 'Color',
        max: 10
      },
      split: {
        label: 'Rows & Columns',
        max: 2
      }
    }, {
      split: [
        {
          field: 'response',
          size: 5,
          agg: 'terms'
        },
        {
          field: '_type',
          size: 5,
          agg: 'terms'
        }
      ],
      segment: [
        {
          field: '@timestamp',
          interval: 'week'
        }
      ],
      group: [
        {
          field: 'extension',
          size: 5,
          agg: 'terms',
          global: true
        }
      ]
    });

    vis.dataSource.$scope($scope);

    $scope.refreshFields = function () {
      $scope.fields = null;
      vis.dataSource.clearFieldCache().then(getFields, notify.error);
    };

    function getFields() {
      vis.dataSource.getFields(function (err, fieldsHash) {
        if (err) return notify.error(err);

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
    // get the fields for initial display
    getFields();

    $scope.Vis = Vis;
    $scope.Aggs = Aggs;

    $scope.updateDataSource = function () {
      notify.event('update data source');
      var config = _.groupBy(vis.getConfig(), function (config) {
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
          agg: 'global'
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

      vis.dataSource.aggs(dsl.aggs).fetch();
      notify.event('update data source', true);
    };

  });
});