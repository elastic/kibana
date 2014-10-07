define(function (require) {
  return function VisTypeFactory(Private) {

    /**
     * Provides the visualizations for the visLib
     *
     * @module visLib
     * @submodule VisTypeFactory
     * @param Private {Service} Loads any function as an angular module
     * @return {Function} Returns an Object of Visualization classes
     */
    return {
      histogram: Private(require('components/vislib/visualizations/column_chart')),
      pie: Private(require('components/vislib/visualizations/pie_chart')),
      line: Private(require('components/vislib/visualizations/line_chart'))
    };
  };

});