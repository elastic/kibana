define(function (require) {
  return function ColumnHandler(d3, Private) {
    var _ = require('lodash');

    var Handler = Private(require('components/vislib/lib/handler/handler'));
    var Data = Private(require('components/vislib/lib/data'));
    var Legend = Private(require('components/vislib/lib/legend'));

    return function (vis) {
      var data = new Data(vis.data, vis._attr);

      var ColumnHandler = new Handler(vis, {
        data: data,
        legend: new Legend(vis, vis.el, data.getLabels(), data.getColorFunc(), vis._attr)
      });

      return ColumnHandler;
    };
  };
});

