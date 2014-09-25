define(function (require) {
  return function HandlerTypeFactory(Private) {
    // handler types
    return {
      histogram: Private(require('components/vislib/lib/handler/types/column')),
      line: Private(require('components/vislib/lib/handler/types/column')),
      pie: Private(require('components/vislib/lib/handler/types/pie'))
    };
  };
});
