
export function createSearchSource(kbnApi, initialState, indexPattern, aggs, useTimeFilter, filters = []) {
  const searchSource = new kbnApi.SearchSource(initialState);
  // Do not not inherit from rootSearchSource to avoid picking up time and globals
  searchSource.inherits(false);
  searchSource.filter(() => {
    const activeFilters = [...filters];
    if (useTimeFilter) {
      activeFilters.push(kbnApi.timeFilter.get(indexPattern));
    }
    return activeFilters;
  });
  searchSource.size(0);
  searchSource.index(indexPattern);
  searchSource.aggs(aggs);
  return searchSource;
}
