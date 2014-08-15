define(function (require) {
  return function FiltersAggDefinition(Private) {
    var _ = require('lodash');
    var AggType = Private(require('components/agg_types/_agg_type'));
    var AggParams = Private(require('components/agg_types/_agg_params'));

    function getTickLabel(query) {
      if (query.query_string && query.query_string.query) {
        return query.query_string.query;
      }

      return JSON.stringify(query);
    }

    return new AggType({
      name: 'filters',
      title: 'Filters',
      params: new AggParams([
        {
          name: 'filters',
          editor: require('text!components/agg_types/controls/filters.html'),
          default: [ {} ],
          write: function (aggConfig, output) {
            output.aggParams = {
              filters: _.transform(aggConfig.params.filters, function (filters, filter, iterator) {
                // We need to check here
                filters[getTickLabel(filter.input)] = {
                  query: filter.input || { query_string: {query: '*'} }
                };
              }, {})
            };
          }
        }
      ])
    });
  };
});