define(function (require) {
  return function HandlerTypeFactory(Private) {
    // handler types
    return {
      histogram: Private(require('components/vislib/lib/handler/axes_handler')),
      line: this.histogram,
      pie: Private(require('components/vislib/lib/handler/pie_handler'))
    };
  };
});
