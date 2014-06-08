define(function (require) {
  return function RangeAggDefinition(timefilter, config) {
    var _ = require('lodash');
    var moment = require('moment');
    var angular = require('angular');

    var agg = this;
    agg.name = 'range';
    agg.display = 'Range';
    //agg.ordered = {};

    agg.makeLabel = function (params) {
      return params.field;
    };

    agg.params = {};

    agg.params.ranges = {
      custom: true,
      default: [{from: 0, to: 1000}, {from: 1000, to: 2000}],
      write: function (input, output) {
        output.aggParams.ranges = input.val;
        output.aggParams.keyed = true;
      }
    };


  };
});