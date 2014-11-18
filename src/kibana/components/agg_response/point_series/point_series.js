define(function (require) {
  return function HistogramConverterFn(Private, timefilter, $compile, $rootScope, $injector) {
    var _ = require('lodash');
    var xAxis = Private(require('components/agg_response/point_series/_x_axis'));
    var yAxis = Private(require('components/agg_response/point_series/_y_axis'));
    var tooltip = Private(require('components/agg_response/point_series/_tooltip'));
    var readRows = Private(require('components/agg_response/point_series/_read_rows'));
    var fakeXAxis = Private(require('components/agg_response/point_series/_fake_x_axis'));

    function findBySchema(name) {
      return function (columns) {
        return _.findIndex(columns, function (col) {
          return col.aggConfig.schema.name === name;
        });
      };
    }

    var findXColumn = findBySchema('segment');
    var findYColumn = findBySchema('metric');
    var findGroupColumn = findBySchema('group');

    function createPointSeries(vis, table) {
      var columns = table.columns;

      var chart = {
        series: []
      };

      // index of color
      var index = {
        x: findXColumn(columns),
        y: findYColumn(columns),
        group: findGroupColumn(columns)
      };

      var col = {
        x: columns[index.x],
        y: columns[index.y],
        group: columns[index.group]
      };

      var agg = _.mapValues(col, function (col) {
        return col && col.aggConfig;
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
