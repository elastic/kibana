define(function (require) {
  return function LayoutTypeFactory(Private) {
    // visLib layout types
    return {
      histogram: Private(require('components/vislib/lib/layout/types/column_layout')),
      line: Private(require('components/vislib/lib/layout/types/column_layout')),
      pie: Private(require('components/vislib/lib/layout/types/pie_layout'))
    };
  };
});