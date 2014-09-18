define(function (require) {
  return function HandlerTypeFactory(Private) {
    // handler types
    return {
      histogram: Private(require('components/vislib/lib/handler/axes_handler')),
      line: Private(require('components/vislib/lib/handler/axes_handler')),
      pie: Private(require('components/vislib/lib/handler/pie_handler'))
    };
  };
});
