define(function (require) {
  return function HistogramConverterFn(Private, timefilter, $compile, $rootScope, $injector) {
    var _ = require('lodash');
    var xAxis = Private(require('components/agg_response/point_series/_x_axis'));
    var yAxis = Private(require('components/agg_response/point_series/_y_axis'));
    var tooltip = Private(require('components/agg_response/point_series/_tooltip'));
    var readRows = Private(require('components/agg_response/point_series/_read_rows'));
    var fakeXAxis = Private(require('components/agg_response/point_series/_fake_x_axis'));

    function findSchema(name) {
      return function (columns) {
        var indexs = columns.reduce(function (list, col, i) {
          if (col.aggConfig.schema.name === name) {
            list.push(i);
          }
          return list;
        }, []);
        return (indexs.length > 1) ? indexs : indexs[0];
      };
    }

    function get(list, indexs) {
      if (!_.isArray(indexs)) {
        return list[indexs];
      }

      return indexs.map(function (i) {
        return list[i];
      });
    }

    var findX = findSchema('segment');
    var findY = findSchema('metric');
    var findSeries = findSchema('group');

    function createPointSeries(vis, table) {
      var columns = table.columns;

      var chart = {
        series: []
      };

      // index of color
      var index = {
        x: findX(columns),
        y: findY(columns),
        series: findSeries(columns)
      };

      if (_.isArray(index.x) || _.isArray(index.series)) {
        throw new TypeError('Only multiple metrics are supported');
      }

      var col = {
        x: get(columns, index.x),
        y: get(columns, index.y),
        series: get(columns, index.series)
      };

      var agg = _.mapValues(col, function (col) {
        if (!col) return;
        if (_.isArray(col)) return _.pluck(col, 'aggConfig');
        return col.aggConfig;
      });

      var locals = {
        vis: vis,
        table: table,
        chart: chart,
        index: index,
        col: col,
        agg: agg,
        invoke: invoke
      };

      function invoke(fn) {
        return $injector.invoke(fn, null, locals);
      }

      // ensure there is an x axis
      if (!col.x) invoke(fakeXAxis);
      locals.xAggOutput = agg.x.write();

      // invoke modules to continue processing
      invoke(xAxis);
      invoke(yAxis);
      invoke(tooltip);
      invoke(readRows);

      return chart;
    }

    return createPointSeries;
  };
});
