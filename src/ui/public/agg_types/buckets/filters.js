import _ from 'lodash';
import angular from 'angular';
import AggTypesBucketsBucketAggTypeProvider from 'ui/agg_types/buckets/_bucket_agg_type';
import AggTypesBucketsCreateFilterFiltersProvider from 'ui/agg_types/buckets/create_filter/filters';
import DecorateQueryProvider from 'ui/courier/data_source/_decorate_query';
import filtersTemplate from 'ui/agg_types/controls/filters.html';
export default function FiltersAggDefinition(Private, Notifier) {
  const BucketAggType = Private(AggTypesBucketsBucketAggTypeProvider);
  const createFilter = Private(AggTypesBucketsCreateFilterFiltersProvider);
  const decorateQuery = Private(DecorateQueryProvider);
  const notif = new Notifier({ location: 'Filters Agg' });

  return new BucketAggType({
    name: 'filters',
    title: 'Filters',
    createFilter: createFilter,
    customLabels: false,
    params: [
      {
        name: 'filters',
        editor: filtersTemplate,
        default: [ { input: {}, label: '' } ],
        write: function (aggConfig, output) {
          const inFilters = aggConfig.params.filters;
          if (!_.size(inFilters)) return;

          const outFilters = _.transform(inFilters, function (filters, filter) {
            const input = filter.input;
            if (!input) return notif.log('malformed filter agg params, missing "input" query');

            const query = input.query;
            if (!query) return notif.log('malformed filter agg params, missing "query" on input');

            decorateQuery(query);

            const label = filter.label || _.get(query, 'query_string.query') || angular.toJson(query);
            filters[label] = input;
          }, {});

          if (!_.size(outFilters)) return;

          const params = output.params || (output.params = {});
          params.filters = outFilters;
        }
      }
    ]
  });
}
