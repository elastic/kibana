define(function (require) {
  return function FiltersAggDefinition(timefilter, config) {
    var _ = require('lodash');
    var moment = require('moment');
    var angular = require('angular');

    var agg = this;
    agg.name = 'filters';
    agg.display = 'Filters';

    agg.makeLabel = function (params) {
      return 'Filters';
    };

    function getTickLabel(query) {
      if (query.query_string && query.query_string.query) return query.query_string.query;
      return JSON.stringify(query);
    }

    agg.params = {};

    agg.params.filters = {
      custom: true,
      default: {query_string: {query: '*'}},
      write: function (input, output) {
        output.aggParams = {
          filters: _.zipObject(_.map(input.val, function (filter, iterator) {
            // We need to check here
            return [
              getTickLabel(filter.input),
              {query: filter.input || {query_string: {query: '*'}}}
            ];
          }))
        };
      }
    };
  };
});