define(function (require) {
  return function FiltersAggDefinition(Private) {
    var _ = require('lodash');
    var AggType = Private(require('components/agg_types/_agg_type'));

    function getTickLabel(query) {

      if (query.query_string && query.query_string.query) {
        return query.query_string.query;
      }
      return JSON.stringify(query);
    }

    return new AggType({
      name: 'filters',
      title: 'Filters',
      params: [
        {
          name: 'filters',
          editor: require('text!components/agg_types/controls/filters.html'),
          default: [ {input: {}} ],
          write: function (aggConfig, output) {
            output.params = {
              filters: _.transform(aggConfig.params.filters, function (filters, filter, iterator) {
                // We need to check here
                filters[getTickLabel(filter.input.query)] = filter.input || {query: {query_string: {query: '*'}}};
              }, {})
            };
          }
        }
      ]
    });
  };
});
