
export function createSearchSource(kbnApi, initialState, indexPattern, aggs, useTimeFilter) {
  const searchSource = new kbnApi.SearchSource(initialState);
  // Do not not inherit from rootSearchSource to avoid picking up time and globals
  searchSource.inherits(false);
  if (useTimeFilter) {
    searchSource.filter(() => {
      return kbnApi.timeFilter.get(indexPattern);
    });
  }
  searchSource.size(0);
  searchSource.index(indexPattern);
  searchSource.aggs(aggs);
  return searchSource;
}
