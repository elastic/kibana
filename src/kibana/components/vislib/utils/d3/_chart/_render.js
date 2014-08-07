define(function (require) {
  return function RenderUtilService(d3, Private) {
    var split = Private(require('components/vislib/utils/d3/_split'));

    return function (args) {
      args.removeAll(args.el);
      // Creates the '.chart' selection(s) by using the split function
      args.callFunction(args.el, args.data, split);
      args.draw();
    };
  };
});
