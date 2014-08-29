define(function (require) {
  return function LayoutTypeFactory(Private) {
    return {
      histogram: Private(require('components/vislib/components/layouts/types/column_layout'))
    };
  };
});