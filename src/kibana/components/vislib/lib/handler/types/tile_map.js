define(function (require) {
  return function MapHandler(d3, Private) {
    var _ = require('lodash');

    var SingleYAxisStrategy = Private(require('components/vislib/lib/_single_y_axis_strategy'));
    var Handler = Private(require('components/vislib/lib/handler/handler'));
    var Data = Private(require('components/vislib/lib/data'));

    return function (vis) {
      var data = new Data(vis.data, vis._attr, new SingleYAxisStrategy());

      var MapHandler = new Handler(vis, {
        data: data
      });

      MapHandler.resize = function () {
        this.charts.forEach(function (chart) {
          chart.resizeArea();
        });
      };

      return MapHandler;
    };
  };
});

