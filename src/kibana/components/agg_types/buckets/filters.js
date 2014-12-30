define(function (require) {
  return function FiltersAggDefinition(Private, Notifier) {
    var _ = require('lodash');
    var AggType = Private(require('components/agg_types/_agg_type'));
    var createFilter = Private(require('components/agg_types/buckets/create_filter/filters'));
    var notif = new Notifier({ location: 'Filters Agg' });

    return new AggType({
      name: 'filters',
      title: 'Filters',
      createFilter: createFilter,
      params: [
        {
          name: 'filters',
          editor: require('text!components/agg_types/controls/filters.html'),
          default: [ {input: {}} ],
          write: function (aggConfig, output) {
            var inFilters = aggConfig.params.filters;
            if (!_.size(inFilters)) return;

            var outFilters = _.transform(inFilters, function (filters, filter) {
              var input = filter.input;
              if (!input) return notif.log('malformed filter agg params, missing "input" query');

              var query = input.query;
              if (!query) return notif.log('malformed filter agg params, missing "query" on input');

              var label = _.deepGet(query, 'query_string.query') || JSON.stringify(query);
              filters[label] = input;
            }, {});

            if (!_.size(outFilters)) return;

            var params = output.params || (output.params = {});
            params.filters = outFilters;
          }
        }
      ]
    });
  };
});
