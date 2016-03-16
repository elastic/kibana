import _ from 'lodash';
import angular from 'angular';
import AggTypesBucketsBucketAggTypeProvider from 'ui/agg_types/buckets/_bucket_agg_type';
import AggTypesBucketsCreateFilterFiltersProvider from 'ui/agg_types/buckets/create_filter/filters';
import DecorateQueryProvider from 'ui/courier/data_source/_decorate_query';
import filtersTemplate from 'ui/agg_types/controls/filters.html';
export default function FiltersAggDefinition(Private, Notifier) {
  var BucketAggType = Private(AggTypesBucketsBucketAggTypeProvider);
  var createFilter = Private(AggTypesBucketsCreateFilterFiltersProvider);
  var decorateQuery = Private(DecorateQueryProvider);
  var notif = new Notifier({ location: 'Filters Agg' });

  return new BucketAggType({
    name: 'filters',
    title: 'Filters',
    createFilter: createFilter,
    customLabels: false,
    params: [
      {
        name: 'filters',
        editor: filtersTemplate,
        default: [ {input: {}, label: ''} ],
        write: function (aggConfig, output) {
          var inFilters = aggConfig.params.filters;
          if (!_.size(inFilters)) return;

          var outFilters = _.transform(inFilters, function (filters, filter) {
            var input = filter.input;
            if (!input) return notif.log('malformed filter agg params, missing "input" query');

            var query = input.query;
            if (!query) return notif.log('malformed filter agg params, missing "query" on input');

            decorateQuery(query);

            var label = filter.label || _.get(query, 'query_string.query') || angular.toJson(query);
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
