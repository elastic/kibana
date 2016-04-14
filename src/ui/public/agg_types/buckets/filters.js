define(function (require) {
  return function FiltersAggDefinition(Private, Notifier) {
    let _ = require('lodash');
    let angular = require('angular');
    let BucketAggType = Private(require('ui/agg_types/buckets/_bucket_agg_type'));
    let createFilter = Private(require('ui/agg_types/buckets/create_filter/filters'));
    let decorateQuery = Private(require('ui/courier/data_source/_decorate_query'));
    let notif = new Notifier({ location: 'Filters Agg' });

    return new BucketAggType({
      name: 'filters',
      title: 'Filters',
      createFilter: createFilter,
      customLabels: false,
      params: [
        {
          name: 'filters',
          editor: require('ui/agg_types/controls/filters.html'),
          default: [ {input: {}, label: ''} ],
          write: function (aggConfig, output) {
            let inFilters = aggConfig.params.filters;
            if (!_.size(inFilters)) return;

            let outFilters = _.transform(inFilters, function (filters, filter) {
              let input = filter.input;
              if (!input) return notif.log('malformed filter agg params, missing "input" query');

              let query = input.query;
              if (!query) return notif.log('malformed filter agg params, missing "query" on input');

              decorateQuery(query);

              let label = filter.label || _.get(query, 'query_string.query') || angular.toJson(query);
              filters[label] = input;
            }, {});

            if (!_.size(outFilters)) return;

            let params = output.params || (output.params = {});
            params.filters = outFilters;
          }
        }
      ]
    });
  };
});
