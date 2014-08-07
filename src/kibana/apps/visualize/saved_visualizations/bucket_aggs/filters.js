define(function (require) {
  return function FiltersAggDefinition(timefilter, config) {
    var _ = require('lodash');
    var moment = require('moment');
    var angular = require('angular');

    var agg = this;
    agg.name = 'filters';
    agg.display = 'Filters';
    //agg.ordered = {};

    agg.makeLabel = function (params) {
      return params.query_string;
    };

    agg.params = {};

    agg.params.filters = {
      custom: true,
      default: [{query_string: '*'}],
      write: function (input, output) {
        output.aggParams = {
          filters: _.zipObject(_.map(input.val, function (filter, iterator) {
            // We need to check here
            return [filter.query_string, {query: {query_string: {query: filter.query_string || '*'}}}];
          }))
        };
      }
    };
  };
});