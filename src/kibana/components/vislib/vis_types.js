define(function (require) {
  return function VisTypeFactory(Private) {
    // VisLib Visualization Types
    return {
      histogram: Private(require('components/vislib/visualizations/column_chart'))
    };
  };
});