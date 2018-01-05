import _ from 'lodash';
import { FilterBarLibMapAndFlattenFiltersProvider } from 'ui/filter_bar/lib/map_and_flatten_filters';
import { FilterBarLibExtractTimeFilterProvider } from 'ui/filter_bar/lib/extract_time_filter';
import { FilterBarLibChangeTimeFilterProvider } from 'ui/filter_bar/lib/change_time_filter';
import { FilterBarLibFilterOutTimeBasedFilterProvider } from 'ui/filter_bar/lib/filter_out_time_based_filter';
import { toKueryExpression, fromKueryExpression, nodeTypes, filterToKueryAST } from 'ui/kuery';

export function AddFiltersToKueryProvider(Private) {
  const mapAndFlattenFilters = Private(FilterBarLibMapAndFlattenFiltersProvider);
  const extractTimeFilter = Private(FilterBarLibExtractTimeFilterProvider);
  const changeTimeFilter = Private(FilterBarLibChangeTimeFilterProvider);
  const filterOutTimeBasedFilter = Private(FilterBarLibFilterOutTimeBasedFilterProvider);

  return async function addFiltersToKuery(state, filters) {
    return mapAndFlattenFilters(filters)
      .then((results) => {
        extractTimeFilter(results)
          .then((timeFilter) => {
            if (timeFilter) {
              changeTimeFilter(timeFilter);
            }
          });
        return results;
      })
      .then(filterOutTimeBasedFilter)
      .then((results) => {
        const newQueries = results.map(filterToKueryAST);
        const allQueries = _.isEmpty(state.query.query)
          ? newQueries
          : [fromKueryExpression(state.query.query), ...newQueries];

        state.query = {
          query: toKueryExpression(nodeTypes.function.buildNode('and', allQueries, 'implicit')),
          language: 'kuery'
        };
      });

  };
}
