define(function (require) {
  return function savedVisualizationFn(Private, savedVisualizations) {
    return {
      service: savedVisualizations,
      name: 'visualizations',
      noun: 'Visualization',
      nouns: 'visualizations'
    };
  };
});
