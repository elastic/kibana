define(function (require) {
  return function RespConvertersService(Private) {
    var histogram = Private(require('apps/visualize/saved_visualizations/resp_converters/histogram'));
    return {
      histogram: histogram,
      line: histogram,
      area: histogram
    };
  };
});