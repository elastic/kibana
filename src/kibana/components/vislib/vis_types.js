define(function (require) {
  return function VisTypeFactory(Private) {
    // visLib visualization types
    return {
      histogram: Private(require('components/vislib/visualizations/column_chart'))
    };
  };
});