define(function (require) {
  return function ChartRenderUtilService(d3, Private) {
    var split = Private(require('components/vislib/components/_functions/d3/_split'));

    return function (that) {
//      that.removeAll(that.el);
//      that.layout(that.el);
      // Creates the '.chart' selection(s) by using the split function
//      that.callFunction(d3.select('.chart-wrapper'), that.data, split);
      that.draw();
    };
  };
});
