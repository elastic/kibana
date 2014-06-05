define(function (require) {
  return function DateHistogramAggDefinition(timefilter, config) {
    var _ = require('lodash');
    var moment = require('moment');

    var agg = this;
    agg.name = 'histogram';
    agg.display = 'Histogram';
    agg.ordered = {};

    agg.makeLabel = function (params) {
      return params.field;
    };

    agg.params = {};
    agg.params.interval = {
      required: true,
      write: function (input, output) {
        output.aggParams.interval = parseInt(input.val, 10);
      }
    };

    agg.params.min_doc_count = {
      custom: true,
      default: false,
      write: function (input, output) {
        if (input.val) output.aggParams.min_doc_count = 0;
        else delete output.aggParams.min_doc_count;
      }
    };

    agg.params.extended_bounds = {
      default: {},
      write: function (input, output) {
        output.aggParams.extended_bounds = {
          min: input.val.min,
          max: input.val.max
        };
      }
    };


  };
});