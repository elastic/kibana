define(function (require) {
  require('directives/validate_ip');

  return function RangeAggDefinition(timefilter, config) {
    var _ = require('lodash');
    var moment = require('moment');
    var angular = require('angular');

    var agg = this;
    agg.name = 'ip_range';
    agg.display = 'IP Range';
    //agg.ordered = {};

    agg.makeLabel = function (params) {
      return params.field;
    };

    agg.params = {};

    agg.params.ranges = {
      custom: true,
      default: [{from: '0.0.0.0', to: '255.255.255.255'}],
      write: function (input, output) {
        output.aggParams.ranges = input.val;
        output.aggParams.keyed = true;
      }
    };


  };
});