export function CallStrategyFetchProvider() {
  return function callStrategyFetch(strategy, requests) {
    return strategy.fetch(requests);
  };
}
